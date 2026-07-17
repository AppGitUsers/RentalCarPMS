from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('staff', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='staffmember',
            name='employment_type',
            field=models.CharField(
                choices=[('permanent', 'Permanent'), ('temporary', 'Temporary')],
                default='permanent',
                max_length=10,
            ),
        ),
    ]
