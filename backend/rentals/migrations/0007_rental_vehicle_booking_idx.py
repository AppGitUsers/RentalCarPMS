from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('rentals', '0006_add_rental_indexes'),
        ('vehicles', '0002_owner_rate_and_rental_snapshots'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='rental',
            index=models.Index(
                fields=['vehicle', 'status', 'scheduled_start'],
                name='rental_veh_status_start_idx',
            ),
        ),
    ]
