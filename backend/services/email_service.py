import os
import smtplib
import json
import urllib.request
import urllib.error
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

def get_email_config():
    smtp_host = os.environ.get('SMTP_HOST') or os.environ.get('SMTP_SERVER')
    smtp_port = int(os.environ.get('SMTP_PORT', '587'))
    smtp_user = os.environ.get('SMTP_USER') or os.environ.get('SMTP_USERNAME')
    smtp_pass = os.environ.get('SMTP_PASS') or os.environ.get('SMTP_PASSWORD')
    email_from = os.environ.get('MAIL_FROM') or os.environ.get('EMAIL_FROM') or 'Diogo Studio <contacto@diogostudio.com>'
    resend_key = os.environ.get('RESEND_API_KEY')
    brevo_key = os.environ.get('BREVO_API_KEY')

    if smtp_host and smtp_user and smtp_pass:
        provider = 'smtp'
    elif resend_key:
        provider = 'resend'
    elif brevo_key:
        provider = 'brevo'
    else:
        provider = 'sandbox'

    return {
        'provider': provider,
        'configured': provider != 'sandbox',
        'smtp_host': smtp_host,
        'smtp_port': smtp_port,
        'smtp_user': smtp_user,
        'smtp_pass': smtp_pass,
        'email_from': email_from,
        'resend_key': resend_key,
        'brevo_key': brevo_key
    }

def get_email_status():
    cfg = get_email_config()
    provider = cfg['provider']
    if provider == 'smtp':
        msg = f"Servidor SMTP activo ({cfg['smtp_host']}:{cfg['smtp_port']})"
    elif provider == 'resend':
        msg = "API de Resend activa"
    elif provider == 'brevo':
        msg = "API de Brevo activa"
    else:
        msg = "Modo Sandbox / Simulado activo (configure variables SMTP en Render o .env para envíos reales)"

    return {
        'provider': provider,
        'configured': cfg['configured'],
        'from_email': cfg['email_from'],
        'smtp_host': cfg['smtp_host'],
        'message': msg
    }

def render_email_html(titulo, contenido_parrafos, boton_texto='Agendar mi Sesión', boton_url='https://wa.me/', nombre_cliente=''):
    greeting = f"¡Hola, {nombre_cliente}!" if nombre_cliente else "¡Hola!"
    lines = [p.strip() for p in contenido_parrafos.splitlines() if p.strip()]
    paragraphs_html = ''.join([f"<p style='margin: 0 0 16px 0; line-height: 1.6; color: #d1d5db; font-size: 15px;'>{p}</p>" for p in lines])

    html = f"""<!DOCTYPE html>
<html lang='es'>
<head>
  <meta charset='utf-8'>
  <meta name='viewport' content='width=device-width, initial-scale=1.0'>
  <title>{titulo}</title>
</head>
<body style='margin:0; padding:0; background-color:#0b0f19; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;'>
  <table width='100%' border='0' cellspacing='0' cellpadding='0' style='background-color:#0b0f19; padding: 30px 10px;'>
    <tr>
      <td align='center'>
        <table width='100%' border='0' cellspacing='0' cellpadding='0' style='max-width: 600px; background-color: #111827; border-radius: 12px; border: 1px solid #1f2937; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);'>
          <!-- Header -->
          <tr>
            <td style='background: linear-gradient(135deg, #1f2937 0%, #111827 100%); padding: 32px 30px; text-align: center; border-bottom: 2px solid #d97706;'>
              <div style='display: inline-block; padding: 8px 14px; background: rgba(217, 119, 6, 0.15); border-radius: 8px; border: 1px solid rgba(217, 119, 6, 0.3); margin-bottom: 8px;'>
                <span style='color: #f59e0b; font-size: 18px; font-weight: bold; letter-spacing: 2px;'>DIOGO STUDIO</span>
              </div>
              <div style='color: #9ca3af; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;'>Fotografía Profesional & Experiencias</div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style='padding: 36px 30px;'>
              <h2 style='color: #f3f4f6; margin: 0 0 10px 0; font-size: 22px; font-weight: 700;'>{titulo}</h2>
              <div style='color: #f59e0b; font-size: 16px; font-weight: 600; margin-bottom: 20px;'>{greeting}</div>
              
              <div style='margin-bottom: 28px;'>
                {paragraphs_html}
              </div>

              <!-- Button CTA -->
              <div style='text-align: center; margin: 32px 0 20px 0;'>
                <a href='{boton_url}' target='_blank' style='display: inline-block; background-color: #d97706; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; letter-spacing: 0.5px; box-shadow: 0 4px 12px rgba(217, 119, 6, 0.35);'>
                  {boton_texto}
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style='background-color: #0d121f; padding: 24px 30px; text-align: center; border-top: 1px solid #1f2937;'>
              <p style='margin: 0 0 8px 0; font-size: 12px; color: #6b7280;'>
                Diogo Studio • Sesiones de Pareja, Maternidad, Bodas y Familias
              </p>
              <p style='margin: 0; font-size: 11px; color: #4b5563;'>
                Recibes este mensaje porque eres cliente registrado en Diogo Studio.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""
    return html

def send_single_email(to_email, subject, html_content, to_name=''):
    cfg = get_email_config()
    provider = cfg['provider']

    if provider == 'sandbox':
        return {
            'success': True,
            'provider': 'sandbox',
            'simulated': True,
            'to': to_email,
            'message': f'Correo a {to_email} simulado con éxito (modo Sandbox)'
        }

    if provider == 'smtp':
        try:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = cfg['email_from']
            msg['To'] = f"{to_name} <{to_email}>" if to_name else to_email

            part = MIMEText(html_content, 'html', 'utf-8')
            msg.attach(part)

            if cfg['smtp_port'] == 465:
                server = smtplib.SMTP_SSL(cfg['smtp_host'], cfg['smtp_port'], timeout=10)
            else:
                server = smtplib.SMTP(cfg['smtp_host'], cfg['smtp_port'], timeout=10)
                server.starttls()

            server.login(cfg['smtp_user'], cfg['smtp_pass'])
            server.sendmail(cfg['email_from'], [to_email], msg.as_string())
            server.quit()
            return {'success': True, 'provider': 'smtp', 'to': to_email}
        except Exception as e:
            return {'success': False, 'provider': 'smtp', 'to': to_email, 'error': str(e)}

    if provider == 'resend':
        try:
            url = 'https://api.resend.com/emails'
            headers = {
                'Authorization': f"Bearer {cfg['resend_key']}",
                'Content-Type': 'application/json'
            }
            payload = {
                'from': cfg['email_from'],
                'to': [to_email],
                'subject': subject,
                'html': html_content
            }
            req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers=headers, method='POST')
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                return {'success': True, 'provider': 'resend', 'to': to_email, 'id': data.get('id')}
        except Exception as e:
            return {'success': False, 'provider': 'resend', 'to': to_email, 'error': str(e)}

    if provider == 'brevo':
        try:
            url = 'https://api.brevo.com/v3/smtp/email'
            headers = {
                'api-key': cfg['brevo_key'],
                'Content-Type': 'application/json'
            }
            from_parts = cfg['email_from'].split('<')
            sender_name = from_parts[0].strip() if len(from_parts) > 1 else 'Diogo Studio'
            sender_email = from_parts[1].replace('>', '').strip() if len(from_parts) > 1 else cfg['email_from']
            payload = {
                'sender': {'name': sender_name, 'email': sender_email},
                'to': [{'email': to_email, 'name': to_name}],
                'subject': subject,
                'htmlContent': html_content
            }
            req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers=headers, method='POST')
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                return {'success': True, 'provider': 'brevo', 'to': to_email, 'messageId': data.get('messageId')}
        except Exception as e:
            return {'success': False, 'provider': 'brevo', 'to': to_email, 'error': str(e)}

    return {'success': False, 'provider': provider, 'error': 'Proveedor no configurado'}

def send_campaign_batch(recipients, subject, html_content):
    results = []
    success_count = 0
    fail_count = 0

    cfg = get_email_config()
    provider = cfg['provider']

    for r in recipients:
        email = r.get('email')
        nombre = r.get('nombre', '')
        if not email or '@' not in email:
            continue

        res = send_single_email(email, subject, html_content, nombre)
        results.append(res)
        if res.get('success'):
            success_count += 1
        else:
            fail_count += 1

    return {
        'total': len(results),
        'sent': success_count,
        'failed': fail_count,
        'provider': provider,
        'simulated': provider == 'sandbox',
        'details': results
    }

