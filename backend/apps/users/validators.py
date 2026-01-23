"""
Custom password validators for ERMS.
"""
import re
from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _
from django.conf import settings


class CustomPasswordValidator:
    """
    Validate password against custom policy requirements.
    - Minimum length (configurable via settings)
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one digit
    - At least one special character
    """
    
    def __init__(self):
        self.min_length = getattr(settings, 'PASSWORD_MIN_LENGTH', 8)
        self.require_uppercase = getattr(settings, 'PASSWORD_REQUIRE_UPPERCASE', True)
        self.require_lowercase = getattr(settings, 'PASSWORD_REQUIRE_LOWERCASE', True)
        self.require_numbers = getattr(settings, 'PASSWORD_REQUIRE_NUMBERS', True)
        self.require_special = getattr(settings, 'PASSWORD_REQUIRE_SPECIAL', True)
    
    def validate(self, password, user=None):
        """Validate the password."""
        errors = []
        
        if len(password) < self.min_length:
            errors.append(
                _(f"Password must be at least {self.min_length} characters long.")
            )
        
        if self.require_uppercase and not re.search(r'[A-Z]', password):
            errors.append(_("Password must contain at least one uppercase letter."))
        
        if self.require_lowercase and not re.search(r'[a-z]', password):
            errors.append(_("Password must contain at least one lowercase letter."))
        
        if self.require_numbers and not re.search(r'\d', password):
            errors.append(_("Password must contain at least one digit."))
        
        if self.require_special and not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            errors.append(
                _("Password must contain at least one special character (!@#$%^&*(),.?\":{}|<>).")
            )
        
        if errors:
            raise ValidationError(errors)
    
    def get_help_text(self):
        """Return help text for password requirements."""
        requirements = [f"at least {self.min_length} characters"]
        
        if self.require_uppercase:
            requirements.append("one uppercase letter")
        if self.require_lowercase:
            requirements.append("one lowercase letter")
        if self.require_numbers:
            requirements.append("one digit")
        if self.require_special:
            requirements.append("one special character")
        
        return _("Your password must contain: " + ", ".join(requirements) + ".")
