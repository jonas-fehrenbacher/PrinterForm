# PrinterForm
This is a finished product and can be injected into every website: Have a \<a>-Tag which links to this sites index.html and change this sites back button link (see config.json).
This project sends print jobs to the email address specified in "server/assets/.env.json" via PHPMailer. In "assets/I18n.json" all used texts can be modified and new languages can be added.
In "assets/config.json" configurations like max attachment memory size, language, back button URL and such can be specified. Cloudflare turnstile is used to verify users, therefore a site key 
(see config.json) and a secret key (see .env.json) is used. ".env.json" holds sensitive data, so it's protected by the "server/assets/.htaccess" file. Emails use HTML and CSS, but most Email
providers support only inline CSS, so "assets/emailCSS.json" is used to specify the emails CSS.

## Printer Form

<img src="preview-img/PrinterForm.PNG" alt="PrinterForm"/> 

## Email loading state

<img src="preview-img/EmailLoadingState.PNG" alt="EmailLoadingState"/> 

## Email confirmation state

<img src="preview-img/EmailConfirmationState.PNG" alt="EmailConfirmationState"/> 

## Email

<img src="preview-img/Email.PNG" alt="Email"/> 

## Error handling

<img src="preview-img/ErrorMessage.PNG" alt="ErrorMessage"/> 

# What is done next?
- Nothing really - everything is finished and fine.