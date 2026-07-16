from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('rentals', '0005_rental_assigned_staff_rental_driver_delivery_charge_and_more'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='rental',
            index=models.Index(fields=['status', 'created_at'], name='rentals_ren_status_created_idx'),
        ),
        migrations.AddIndex(
            model_name='rental',
            index=models.Index(fields=['payment_status', 'created_at'], name='rentals_ren_pmt_status_created_idx'),
        ),
        migrations.AddIndex(
            model_name='rental',
            index=models.Index(fields=['scheduled_start'], name='rentals_ren_sched_start_idx'),
        ),
        migrations.AddIndex(
            model_name='rental',
            index=models.Index(fields=['scheduled_end'], name='rentals_ren_sched_end_idx'),
        ),
    ]
