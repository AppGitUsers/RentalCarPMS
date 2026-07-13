from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0001_initial'),
        ('staff', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='adminuser',
            name='role',
            field=models.CharField(choices=[('admin', 'Admin'), ('staff', 'Staff')], default='admin', max_length=10),
        ),
        migrations.AddField(
            model_name='adminuser',
            name='staff_member',
            field=models.OneToOneField(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='user_account',
                to='staff.staffmember',
            ),
        ),
    ]
