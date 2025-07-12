"""
Email notification service using Resend for sending notifications.
"""

import os
from typing import Dict, Optional

import resend
from app.config.settings import settings


class EmailNotificationService:
    """Service for sending email notifications using Resend."""

    def __init__(self):
        self.resend_api_key = os.getenv("RESEND_API_KEY")
        if self.resend_api_key:
            resend.api_key = self.resend_api_key

        self.from_email = os.getenv("FROM_EMAIL", "noreply@example.com")
        self.enabled = bool(self.resend_api_key)

    async def send_notification_email(
        self,
        to_email: str,
        to_name: str,
        subject: str,
        message: str,
        notification_type: str,
        action_url: Optional[str] = None,
    ) -> bool:
        """Send a notification email using Resend."""

        if not self.enabled:
            print("Email notifications disabled - no RESEND_API_KEY configured")
            return False

        try:
            # Generate HTML content
            html_content = self._generate_email_html(
                to_name=to_name,
                subject=subject,
                message=message,
                notification_type=notification_type,
                action_url=action_url,
            )

            # Send email
            email = resend.Emails.send(
                {
                    "from": self.from_email,
                    "to": [to_email],
                    "subject": subject,
                    "html": html_content,
                    "text": message,
                }
            )

            print(f"Email sent successfully: {email}")
            return True

        except Exception as e:
            print(f"Failed to send email notification: {e}")
            return False

    def _generate_email_html(
        self,
        to_name: str,
        subject: str,
        message: str,
        notification_type: str,
        action_url: Optional[str] = None,
    ) -> str:
        """Generate HTML email content."""

        # Get notification-specific styling
        styles = self._get_notification_styles(notification_type)

        action_button = ""
        if action_url:
            action_button = f"""
            <div style="text-align: center; margin: 30px 0;">
                <a href="{action_url}" 
                   style="background-color: {styles['button_color']}; 
                          color: white; 
                          padding: 12px 24px; 
                          text-decoration: none; 
                          border-radius: 6px; 
                          display: inline-block;
                          font-weight: 600;">
                    View Details
                </a>
            </div>
            """

        html_template = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>{subject}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4;">
            <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 0; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <!-- Header -->
                <div style="background-color: {styles['header_color']}; color: white; padding: 20px; text-align: center;">
                    <h1 style="margin: 0; font-size: 24px;">Q&A Platform</h1>
                    <div style="background-color: {styles['badge_color']}; 
                                display: inline-block; 
                                padding: 4px 12px; 
                                border-radius: 12px; 
                                font-size: 12px; 
                                margin-top: 8px;
                                text-transform: uppercase;
                                letter-spacing: 0.5px;">
                        {notification_type.replace('_', ' ')}
                    </div>
                </div>
                
                <!-- Content -->
                <div style="padding: 30px;">
                    <h2 style="color: {styles['header_color']}; margin-top: 0; font-size: 20px;">
                        Hi {to_name}!
                    </h2>
                    
                    <div style="background-color: #f8f9fa; 
                                padding: 20px; 
                                border-left: 4px solid {styles['accent_color']}; 
                                margin: 20px 0;
                                border-radius: 0 6px 6px 0;">
                        <p style="margin: 0; font-size: 16px;">
                            {message}
                        </p>
                    </div>
                    
                    {action_button}
                    
                    <hr style="border: none; height: 1px; background-color: #e9ecef; margin: 30px 0;">
                    
                    <div style="color: #6c757d; font-size: 14px;">
                        <p>You're receiving this because you're subscribed to notifications on our Q&A platform.</p>
                        <p>If you don't want to receive these emails, you can 
                           <a href="#" style="color: {styles['header_color']};">update your notification preferences</a>.
                        </p>
                    </div>
                </div>
                
                <!-- Footer -->
                <div style="background-color: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 12px;">
                    <p style="margin: 0;">© 2025 Q&A Platform. All rights reserved.</p>
                    <p style="margin: 5px 0 0 0;">
                        This email was sent from an automated system. Please do not reply.
                    </p>
                </div>
            </div>
        </body>
        </html>
        """

        return html_template

    def _get_notification_styles(self, notification_type: str) -> Dict[str, str]:
        """Get color scheme based on notification type."""

        styles_map = {
            "question_answered": {
                "header_color": "#28a745",
                "badge_color": "rgba(255, 255, 255, 0.2)",
                "accent_color": "#28a745",
                "button_color": "#28a745",
            },
            "answer_accepted": {
                "header_color": "#007bff",
                "badge_color": "rgba(255, 255, 255, 0.2)",
                "accent_color": "#007bff",
                "button_color": "#007bff",
            },
            "answer_commented": {
                "header_color": "#17a2b8",
                "badge_color": "rgba(255, 255, 255, 0.2)",
                "accent_color": "#17a2b8",
                "button_color": "#17a2b8",
            },
            "user_mentioned": {
                "header_color": "#ffc107",
                "badge_color": "rgba(0, 0, 0, 0.2)",
                "accent_color": "#ffc107",
                "button_color": "#ffc107",
            },
            "system_announcement": {
                "header_color": "#6f42c1",
                "badge_color": "rgba(255, 255, 255, 0.2)",
                "accent_color": "#6f42c1",
                "button_color": "#6f42c1",
            },
        }

        return styles_map.get(
            notification_type,
            {
                "header_color": "#343a40",
                "badge_color": "rgba(255, 255, 255, 0.2)",
                "accent_color": "#343a40",
                "button_color": "#343a40",
            },
        )

    # Specific notification methods
    async def send_question_answered_email(
        self,
        to_email: str,
        to_name: str,
        question_title: str,
        answerer_name: str,
        question_id: str,
    ) -> bool:
        """Send email when question is answered."""

        subject = f"Your question '{question_title}' has been answered"
        message = f"{answerer_name} just answered your question: '{question_title}'. Check it out to see if it helps!"
        action_url = (
            f"{settings.FRONTEND_URL}/questions/{question_id}"
            if hasattr(settings, "FRONTEND_URL")
            else None
        )

        return await self.send_notification_email(
            to_email=to_email,
            to_name=to_name,
            subject=subject,
            message=message,
            notification_type="question_answered",
            action_url=action_url,
        )

    async def send_answer_accepted_email(
        self, to_email: str, to_name: str, question_title: str, answer_id: str
    ) -> bool:
        """Send email when answer is accepted."""

        subject = "Your answer was accepted! 🎉"
        message = f"Congratulations! Your answer to '{question_title}' was accepted as the best answer."
        action_url = (
            f"{settings.FRONTEND_URL}/answers/{answer_id}"
            if hasattr(settings, "FRONTEND_URL")
            else None
        )

        return await self.send_notification_email(
            to_email=to_email,
            to_name=to_name,
            subject=subject,
            message=message,
            notification_type="answer_accepted",
            action_url=action_url,
        )

    async def send_answer_commented_email(
        self,
        to_email: str,
        to_name: str,
        commenter_name: str,
        answer_content_preview: str,
        answer_id: str,
    ) -> bool:
        """Send email when answer is commented on."""

        subject = "New comment on your answer"
        message = f"{commenter_name} commented on your answer: '{answer_content_preview[:100]}...'"
        action_url = (
            f"{settings.FRONTEND_URL}/answers/{answer_id}"
            if hasattr(settings, "FRONTEND_URL")
            else None
        )

        return await self.send_notification_email(
            to_email=to_email,
            to_name=to_name,
            subject=subject,
            message=message,
            notification_type="answer_commented",
            action_url=action_url,
        )

    async def send_user_mentioned_email(
        self,
        to_email: str,
        to_name: str,
        mentioner_name: str,
        content_type: str,
        content_id: str,
    ) -> bool:
        """Send email when user is mentioned."""

        subject = f"You were mentioned by {mentioner_name}"
        message = f"{mentioner_name} mentioned you in a {content_type}. Check it out!"
        action_url = (
            f"{settings.FRONTEND_URL}/{content_type}s/{content_id}"
            if hasattr(settings, "FRONTEND_URL")
            else None
        )

        return await self.send_notification_email(
            to_email=to_email,
            to_name=to_name,
            subject=subject,
            message=message,
            notification_type="user_mentioned",
            action_url=action_url,
        )

    async def send_system_announcement_email(
        self, to_email: str, to_name: str, title: str, message: str
    ) -> bool:
        """Send system announcement email."""

        return await self.send_notification_email(
            to_email=to_email,
            to_name=to_name,
            subject=title,
            message=message,
            notification_type="system_announcement",
        )


# Global instance
email_notification_service = EmailNotificationService()
