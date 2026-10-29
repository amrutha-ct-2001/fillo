from django.db import migrations, models


def set_default_min_redeem(apps, schema_editor):
    Settings = apps.get_model('points', 'Settings')
    for row in Settings.objects.all():
        if row.min_redeem_points == 0:
            row.min_redeem_points = 10
            row.save(update_fields=['min_redeem_points'])


class Migration(migrations.Migration):
    dependencies = [
        ('points', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='settings',
            name='min_redeem_points',
            field=models.PositiveIntegerField(
                default=10,
                help_text='Customer must have at least this many points to redeem.',
            ),
        ),
        migrations.RunPython(set_default_min_redeem, migrations.RunPython.noop),
    ]
