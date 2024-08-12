from django import template
from datetime import datetime

register = template.Library()

# Convert the UTC time string to human-readable format
@register.filter(name='format_datetime')
def format_datetime(value, format_string='%Y-%m-%d %H:%M:%S'):
    """
    Converts a UTC datetime string to a human-readable format.
    :param value: UTC datetime string (ISO 8601 format)
    :param format_string: Desired format (default: '%Y-%m-%d %H:%M:%S')
    :return: Formatted datetime string
    """
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return dt.strftime(format_string)
    except (ValueError, TypeError):
        return value
