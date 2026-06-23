import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('staff', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Shift',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=50)),
                ('start_time', models.TimeField()),
                ('end_time', models.TimeField()),
                ('late_grace_minutes', models.PositiveIntegerField(default=15, help_text='Minutes after shift start before an entry is flagged as late.')),
                ('ot_grace_minutes', models.PositiveIntegerField(default=15, help_text='Minutes after shift end before overtime starts counting.')),
                ('is_active', models.BooleanField(default=True)),
            ],
            options={'ordering': ['start_time']},
        ),
        migrations.AddField(
            model_name='staffmember',
            name='default_shift',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='staff_members',
                to='staff.shift',
                help_text='Default shift template for this staff member.',
            ),
        ),
        migrations.AddField(
            model_name='attendance',
            name='shift',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='attendance_records',
                to='staff.shift',
            ),
        ),
        migrations.AddField(
            model_name='attendance',
            name='is_late',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='attendance',
            name='overtime_hours',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=5),
        ),
        migrations.AddField(
            model_name='salarypayment',
            name='late_count',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name='salarypayment',
            name='overtime_hours_total',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=7),
        ),
    ]
