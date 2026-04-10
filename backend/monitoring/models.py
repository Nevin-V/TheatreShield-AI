from django.db import models
import uuid

class Theatre(models.Model):
    name = models.CharField(max_length=255)
    location = models.CharField(max_length=255)
    hardware_id = models.CharField(max_length=255, unique=True, blank=True, null=True)

class Screen(models.Model):
    theatre = models.ForeignKey(Theatre, on_delete=models.CASCADE, related_name='screens')
    name = models.CharField(max_length=50)

class Camera(models.Model):
    screen = models.ForeignKey(Screen, on_delete=models.CASCADE, related_name='cameras')
    name = models.CharField(max_length=50)
    url = models.CharField(max_length=255, blank=True)

class Alert(models.Model):
    message = models.CharField(max_length=255)
    confidence = models.IntegerField()
    duration = models.FloatField()
    timestamp = models.DateTimeField(auto_now_add=True)
    seat_number = models.CharField(max_length=50, blank=True, null=True)
    camera = models.ForeignKey(Camera, on_delete=models.SET_NULL, null=True, blank=True)
    evidence_image = models.TextField(blank=True, null=True)  # Base64 forensic snapshot

class KDMToken(models.Model):
    token = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    movie_title = models.CharField(max_length=255)
    theatre = models.ForeignKey(Theatre, on_delete=models.CASCADE)
    hardware_id = models.CharField(max_length=255)  # Bound to specific device
    valid_from = models.DateTimeField()
    valid_until = models.DateTimeField()
    is_active = models.BooleanField(default=True)
    use_count = models.IntegerField(default=0)
    max_uses = models.IntegerField(default=1)  # Prevents replay after first valid use
