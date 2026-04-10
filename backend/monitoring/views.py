import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from datetime import datetime
from django.utils import timezone
from .models import Alert, KDMToken, Theatre

@csrf_exempt
def alerts_view(request):
    if request.method == 'GET':
        alerts = Alert.objects.all().order_by('-timestamp')[:50]
        data = [{
            'id': a.id,
            'message': a.message,
            'confidence': a.confidence,
            'duration': a.duration,
            'timestamp': a.timestamp.strftime("%I:%M:%S %p"),
            'seat_number': a.seat_number,
            'evidence_image': a.evidence_image
        } for a in alerts]
        return JsonResponse({'alerts': data})
    
    if request.method == 'DELETE':
        Alert.objects.all().delete()
        return JsonResponse({'success': True})
        
    return JsonResponse({'error': 'Method not allowed'}, status=405)

@csrf_exempt
def alert_view(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            if 'message' not in data:
                return JsonResponse({'error': 'Message required'}, status=400)
            
            alert = Alert.objects.create(
                message=data.get('message', 'Recording Detected'),
                confidence=data.get('confidence', 0),
                duration=data.get('duration', 0.0),
                seat_number=data.get('seat_number', None),
                evidence_image=data.get('evidence_image', None)
            )
            return JsonResponse({'success': True, 'id': alert.id}, status=201)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)
    return JsonResponse({'error': 'Method not allowed'}, status=405)

@csrf_exempt
def generate_kdm(request):
    """
    Provider generates a KDM token bound to a specific theatre hardware ID.
    The hardware_id is a unique fingerprint of the theatre's playback system.
    Even if the token is leaked/shared, it will only work on the exact device it was issued for.
    """
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            
            hardware_id = data.get('hardware_id', '').strip()
            if not hardware_id:
                return JsonResponse({'error': 'hardware_id is required to bind the token to a device.'}, status=400)
            
            theatre, _ = Theatre.objects.get_or_create(
                name=data.get('theatre_name', 'Default Theatre'),
                defaults={'location': 'Unknown', 'hardware_id': hardware_id}
            )
            
            valid_from = datetime.fromisoformat(data['valid_from'].replace('Z', '+00:00'))
            valid_until = datetime.fromisoformat(data['valid_until'].replace('Z', '+00:00'))
            
            token = KDMToken.objects.create(
                movie_title=data.get('movie_title', 'Untitled'),
                theatre=theatre,
                hardware_id=hardware_id,  # Cryptographically bound to this hardware ID
                valid_from=valid_from,
                valid_until=valid_until,
                max_uses=int(data.get('max_uses', 5))  # e.g. 5 screening sessions max
            )
            return JsonResponse({'success': True, 'token': str(token.token)})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)
    return JsonResponse({'error': 'Method not allowed'}, status=405)

@csrf_exempt
def validate_kdm(request):
    """
    Theatre system validates its KDM token.
    Fails if:
      - Token doesn't exist
      - Outside valid time window
      - Token is inactive (revoked)
      - hardware_id doesn't match (i.e. shared/stolen token used on wrong device)
      - max_uses exceeded (single-use guard)
    """
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            token_str = data.get('token', '').strip()
            hardware_id = data.get('hardware_id', '').strip()

            if not token_str:
                return JsonResponse({'valid': False, 'reason': 'Missing token.'})
            if not hardware_id:
                return JsonResponse({'valid': False, 'reason': 'Missing hardware ID. Device not registered.'})
            
            token = KDMToken.objects.get(token=token_str)
            
            # 1. Check hardware ID binding
            if token.hardware_id != hardware_id:
                return JsonResponse({
                    'valid': False,
                    'reason': '🔒 Device Mismatch: This token is locked to a different theatre system. Unauthorized access blocked.'
                })
            
            # 2. Check active flag (revocation)
            if not token.is_active:
                return JsonResponse({'valid': False, 'reason': '⛔ Token has been revoked by the content provider.'})
            
            # 3. Check time window
            now = timezone.now()
            if not (token.valid_from <= now <= token.valid_until):
                return JsonResponse({
                    'valid': False,
                    'reason': f'⏰ Outside authorized showtime window ({token.valid_from.strftime("%Y-%m-%d %H:%M")} – {token.valid_until.strftime("%H:%M %Z")}).'
                })
            
            # 4. Check max usage limit
            if token.use_count >= token.max_uses:
                return JsonResponse({'valid': False, 'reason': f'🚫 Token usage limit reached ({token.max_uses} screenings authorized).'})
            
            # All checks passed — increment the use counter
            token.use_count += 1
            token.save()
            
            return JsonResponse({
                'valid': True,
                'movie': token.movie_title,
                'theatre': token.theatre.name,
                'screenings_used': token.use_count,
                'screenings_left': token.max_uses - token.use_count,
                'reason': 'Token verified. Secure stream authorized.'
            })
        except KDMToken.DoesNotExist:
            return JsonResponse({'valid': False, 'reason': '❌ Invalid KDM token – No authorization record found.'}, status=404)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)
    return JsonResponse({'error': 'Method not allowed'}, status=405)
