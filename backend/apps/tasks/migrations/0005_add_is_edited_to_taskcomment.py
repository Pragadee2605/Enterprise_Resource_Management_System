# Generated manually to add missing is_edited column

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tasks', '0004_label_sprint_description_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='taskcomment',
            name='is_edited',
            field=models.BooleanField(default=False),
        ),
    ]
