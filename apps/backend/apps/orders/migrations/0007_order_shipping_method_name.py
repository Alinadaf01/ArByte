from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0006_orderitemunit'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='shipping_method_name',
            field=models.CharField(blank=True, default='', max_length=100),
        ),
    ]
