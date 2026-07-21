from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('settings_app', '0002_remove_applicationsettings_default_owner_share_percent_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='applicationsettings',
            name='booking_buffer_hours',
            field=models.PositiveIntegerField(
                default=2,
                help_text="Minimum gap (hours) required between a rental's end and the next booking's scheduled start.",
            ),
        ),
        migrations.AddField(
            model_name='applicationsettings',
            name='booking_lock_hours',
            field=models.PositiveIntegerField(
                default=26,
                help_text='Within this many hours of an upcoming booking, show a warning when creating or extending a rental.',
            ),
        ),
    ]
