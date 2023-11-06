<?php
    /**
     * Send a email via this script.
     * 
     * PHP 
     * - ini file:
     *   php.ini file contains the php configuration and there you can specify your smtp settings (server, port). But there seems to
     *   be no setting for username and password. Use 'echo phpinfo()' to get all infos and search for "Loaded Configuration File".
     *   The configuration file is read once when the webserver is started, so if you change this file, then restart your webserver.
     *   Alternatively you can use 'ini_set()' to set php settings.
     * - print last error to console: print_r( error_get_last() );
     * - OpenSSL extension:
     *   Error message: "Extension missing: openssl Message could not be sent. Mailer Error: Extension missing: openssl".
     *   To prevent this error open php.ini and activate the OpenSSL extension. To do this there are two options: (1) Specify an absolte
     *   path to your extension: 'extension=F:/projects/PrinterForm/ext/php_openssl.dll'; (2) Activate the extension: 'extension=openssl'
     *   and specify the path of your extension directory: 'extension_dir = "ext"' for windows or 'extension_dir = "./"' for linux. Doing
     *   this will load the extension from your php directory where 'php.exe' is.
     *   Of course you need to tell your php server where the php.ini file is.
     *   Note that extensions can not be loaded via ini_set, php.ini needs to be used.
     * 
     *  Change 'upload_max_filesize = 2M' in php.ini to send larger files to the server and also change 'post_max_size = 8M', so your
     *  post request may be large enough. Make sure, that 'memory_limit = 128M' is large enough. With that change 'max_execution_time = 30' 
     *  and 'max_input_time = 60' to 0 and -1 respectivelly, to have unlimited time. There is also 'max_file_uploads = 20' to upload a fixed 
     *  amount of files.
     *  see: https://www.php.net/manual/en/features.file-upload.common-pitfalls.php
     * 
     * require:
     * The include and require statements are identical, except upon failure: 'require' throws an error and 'include' a warning.
     */

    require '../PHPMailer/src/Exception.php';
    require '../PHPMailer/src/PHPMailer.php';
    require '../PHPMailer/src/SMTP.php';
    use PHPMailer\PHPMailer\PHPMailer;
    use PHPMailer\PHPMailer\SMTP;
    use PHPMailer\PHPMailer\Exception;

    // Load environment:
    $env = file_get_contents("../assets/test.env.json");
    $env = json_decode($env);

    // Verify cloudflare turnsite token:
    // see: https://community.cloudflare.com/t/is-there-a-turnstile-php-installation-example/425587/2
    {
        $captcha = $_POST['cf-turnstile-response'];
        if (!$captcha) {
            // What happens when the CAPTCHA was entered incorrectly
            echo '<h2>Please check the captcha.</h2>';
            exit;
        }
        $ip = $_SERVER['REMOTE_ADDR'];
        $data = array('secret' => $env->captchaSecretKey, 'response' => $captcha, 'remoteip' => $ip);
        $cloudflareSiteverifyURL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
        $options = array(
            'http' => array(
                'method' => 'POST',
                'content' => http_build_query($data)
            )
        );
        $stream = stream_context_create($options);
        $result = file_get_contents($cloudflareSiteverifyURL, false, $stream); // requires SSL, so php.ini must be loaded with extension=openssl
        $responseKeys = json_decode($result, true);
        if(intval($responseKeys["success"]) !== 1) { // intval: convert to integer
            echo '<h2>Spam?</h2>';
            exit;
        }
    }

    // Get send data (parameter): 
    $from        = isset($_POST["from"])     ? $_POST["from"] : $env->email->username; // for reply-to
    $fromName    = isset($_POST["fromName"]) ? $_POST["fromName"] : "Unbekannt";
    $subject     = isset($_POST["subject"])  ? $_POST["subject"] : "Unbekannt";
    $body        = isset($_POST["body"])     ? $_POST["body"] : "Unbekannt";
    if ($env->email->debugMessage) {
        print_r($_FILES);
        print_r("|START-PRAR| fromName: ".$fromName."subject: ".$subject."; body: ".$body."; files: ".$_FILES["attachments"]." |END-PARA|");
    }

    $mail = new PHPMailer(true);

    try {
        //Server settings
        if ($env->email->debugMessage)
             $mail->SMTPDebug = SMTP::DEBUG_SERVER;        // Enable verbose debug output
        else $mail->SMTPDebug = SMTP::DEBUG_OFF;
        $mail->isSMTP();                                   // Send using SMTP
        $mail->Host       = $env->email->host;             // Set the SMTP server to send through
        $mail->SMTPAuth   = true;                          // Enable SMTP authentication
        $mail->Username   = $env->email->username;         // SMTP username
        $mail->Password   = $env->email->password;         // SMTP password
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;   // Enable implicit TLS encryption
        $mail->Port       = $env->email->port;             // TCP port to connect to [use 587 if you have set `SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS`]
        $mail->CharSet    = 'UTF-8';                       // Otherwise german umlauts are not displayed properly
    
        //Recipients
        $mail->addAddress($env->email->username, $env->email->name);    //Add a recipient
        $mail->setFrom($env->email->username, $fromName); // It has to be from the same address I'm sending to, but the name can be of the customer.
        $mail->addReplyTo($from, $fromName);
        //$mail->addCC('cc@example.com');
        //$mail->addBCC('bcc@example.com');
    
        //Attachments
        if (isset($_FILES["attachments"])) {
            for ($i = 0; $i < count($_FILES["attachments"]["name"]); ++$i) {
                $mail->addAttachment($_FILES["attachments"]["tmp_name"][$i], $_FILES["attachments"]["name"][$i]); //Optional name
            }
        }

        // Alt html
        $altHTML = "";
        {
            // [1] Strip style element
            $styleEndTag = "</style>";
            $styleEndPos = strpos($body, $styleEndTag);
            if ($styleEndPos !== false) { // can return index 0 and false
                $AfterStyleEndPos = $styleEndPos + strlen($styleEndTag);
                $altHTML = substr($body, $AfterStyleEndPos);
            }
            // [2] Remove all tags
            $altHTML = strip_tags($altHTML);
        }
    
        //Content
        $mail->isHTML(true);  //Set email format to HTML
        $mail->Subject = $subject;
        $mail->Body    = $body;
        $mail->AltBody = $altHTML; // On mobile phones this text will be displayed before the email is opened.
    
        $mail->send();
        echo 'Message has been sent';
    } catch (Exception $e) {
        echo "Message could not be sent. Mailer Error: {$mail->ErrorInfo}";
    }
?>