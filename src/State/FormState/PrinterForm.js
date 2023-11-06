"use strict";

import { MessageBus, Message } from "../../Core/MessageBus.js";
import { PrintJobList } from "./PrintJobList.js";
import * as Tools from "../../Core/Tools.js";
import { ErrorMessageBox } from "./ErrorMessageBox.js";

export class PrinterForm
{
    #htmlCacheRef;
    #configRef;
    #i18nRef;
    #messageBusRef;

    #htmlElem;
    #htmlTitle;
    #htmlSubtitle;
    #htmlDescription;
    #htmlNameInput;
    #htmlEmailInput;
    #htmlPhoneInput;
    #htmlMessageInput;
    #htmlAddBtn;
    #htmlSubmitBtn;

    #printJobList;
    #errorMessageBox;

    constructor(i18nRef, messageBusRef, configRef, htmlCacheRef)
    {
        this.#htmlCacheRef     = htmlCacheRef;
        this.#messageBusRef    = messageBusRef;
        this.#i18nRef          = i18nRef;
        this.#configRef        = configRef;
        this.#printJobList     = new PrintJobList(i18nRef, messageBusRef, htmlCacheRef);
        this.#errorMessageBox  = new ErrorMessageBox(i18nRef, htmlCacheRef);
        this.#htmlElem         = {};
        this.#htmlTitle        = {};
        this.#htmlSubtitle     = {};
        this.#htmlDescription  = {};
        this.#htmlNameInput    = {};
        this.#htmlEmailInput   = {};
        this.#htmlPhoneInput   = {};
        this.#htmlMessageInput = {};
        this.#htmlAddBtn       = {};
        this.#htmlSubmitBtn    = {};

        messageBusRef.add(this.#onMessage.bind(this));
    }

    async init(htmlMainRef)
    {
        // The following may not be IDs, because IDs can only be queried from 'document', but this not set in the document, yet.
        this.#htmlElem         = Tools.getHTMLElementById("form", htmlMainRef);
        htmlMainRef.appendChild(this.#htmlElem);
        this.#htmlTitle        = Tools.getHTMLElementById("form-title", this.#htmlElem);
        this.#htmlSubtitle     = Tools.getHTMLElementById("form-subtitle", this.#htmlElem);
        this.#htmlDescription  = Tools.getHTMLElementById("form-description", this.#htmlElem);
        this.#htmlNameInput    = Tools.getHTMLElementById("form-name", this.#htmlElem);
        this.#htmlEmailInput   = Tools.getHTMLElementById("form-email", this.#htmlElem);
        this.#htmlPhoneInput   = Tools.getHTMLElementById("form-phone", this.#htmlElem);
        this.#htmlMessageInput = Tools.getHTMLElementById("form-message", this.#htmlElem);
        this.#htmlAddBtn       = Tools.getHTMLElementsByClassName("addBtn", this.#htmlElem)[0];
        this.#htmlSubmitBtn    = Tools.getHTMLElementById("form-submitButton", this.#htmlElem);
        Tools.getHTMLElementById("captcha", this.#htmlElem).setAttribute("data-sitekey", this.#configRef.captchaSitekey);

        this.#htmlAddBtn.addEventListener("click", this.#addPrintJob.bind(this));
        this.#htmlElem.addEventListener("submit", (function () {
            // State may not be changed because of 'turnstile.reset()'.
            //this.#messageBusRef.send(Message.emailIsBeingPrepared); // show app loading bar - sometimes after pressing submit the website takes its time. This prevents double clicking submit.
            this.sendEmail();
        }).bind(this));

        this.#printJobList.init(this.#htmlElem, this.#configRef);
        this.#errorMessageBox.init(this.#htmlElem);
    }

    /**
     * 'Host', 'Username' and 'Password' can be removed for 'SecureToken'.
     * @note smtpJS now only supports "Elastic Email" as host (no gmail etc.), but in your elastic email account
     * you can specify a domain and create a SMTP, so that a email is send to your address.
     * @note 'From' works only with validated email addresses, so just use your email address from 'To'.
     * Error message: Only elasticemail is supported as an SMTP host. To open an account please visit https://elasticemail.com/account#/create-account?r=20b444a2-b3af-4eb8-bae7-911f6097521c
     * @note Google has changed their privacy rules, so sending a email to gmail is probably not working, but web.de is fine.
     * 
     * @see sendMail https://stackoverflow.com/a/7381205/8856833
     * @see encodeURIComponent https://wiki.selfhtml.org/wiki/JavaScript/encodeURIComponent
     * @see web.de https://hilfe.web.de/pop-imap/imap/imap-serverdaten.html
     * @see smtpjs https://smtpjs.com/
     * @see tutorial https://www.youtube.com/watch?v=sGQSz22U8VM
     */
    async sendEmail()
    {
        // form example: https://www.sedruck.de/upload.html?upload
        // TODO: Not working because of turnstile.reset(): ATTENTION: Before I call this function I switch to the appLoadingState. Meaning, this form is not in the DOM, so make no document DOM operations.

        // Get form data:
        const htmlForm = new FormData(this.#htmlElem); // Do not use 'event.target' - it compiles, but causes an error
        let form = {
            name:      htmlForm.get("form-name"),
            email:     htmlForm.get("form-email"),
            phone:     htmlForm.get("form-phone"),
            message:   htmlForm.get("form-message"),
            captcha:   htmlForm.get("cf-turnstile-response") // invisible input that was automatically added; is the token
        }; /* wordpress throws an error if this semicolon is missing. */

        // Check captcha:
        if (typeof form.captcha !== "undefined" && form.captcha !== null)
        {
            console.log(typeof form.captcha);
            const htmlCaptcha = Tools.getHTMLElementById("captchaRequired", this.#htmlElem);
            if (form.captcha === "") {
                // Do not reset form.
                htmlCaptcha.innerHTML = this.#i18nRef.get("captchaErrorMessage");
                return;
            }
            else {
                htmlCaptcha.innerHTML = "";
                // Attention, 'turnstile.reset()' can not be used if you load a diffrent state - its not in the DOM!
                turnstile.reset(); // captcha needs to be reset manually. 
            }
        }

        // Get print jobs:
        let printJobs = this.#printJobList.fetchHTML(); // load and get HTML form printJobList values

        // Check form input
        {
            this.#errorMessageBox.clear();

            let errorMessages = [];
            // [1] Special paper format:
            for (const printJob of printJobs)
            {
                if (printJob.format == "form-printJob-format-special" && form.message === "") {
                    errorMessages.push(this.#i18nRef.get("error-printJob-format"));
                    break;
                }
            }

            // [2] Attachment size:
            let MAX_ATTACHMENT_MEMSIZE = this.#configRef.email.maxAttachmentsMemorySize;
            let totalFileMemorySize = 0;
            for (const printJob of printJobs) {
                for (const file of printJob.files) {
                    totalFileMemorySize += file.size;
                }
            }
            if (totalFileMemorySize > MAX_ATTACHMENT_MEMSIZE) {
                errorMessages.push(Tools.format(this.#i18nRef.get("error-attachmentMemSize"), MAX_ATTACHMENT_MEMSIZE / 1000 / 1000, "MB"));
            }

            if (errorMessages.length > 0) {
                for (const errorMessage of errorMessages) {
                    this.#errorMessageBox.push(errorMessage);
                }
                return;
            }
        }

        // Email body:
        let body = "";
        {
            let htmlEmail = Tools.getHTMLElementByString(this.#htmlCacheRef.get("Email"),
                Tools.HTMLElementSearchType.id, "email"
            );

            // Set header:
            let htmlHeader = Tools.getHTMLElementById("header", htmlEmail);
            htmlHeader.textContent = this.#i18nRef.get("email-title");

            // Set personal data:
            let htmlPersonalData = Tools.getHTMLElementById("personalData", htmlEmail);
            let personalData = [ 
                [ "email-personalDataTitle", "" ], 
                [ "email-personalData-nameTitle", form.name ], 
                [ "email-personalData-emailTitle", form.email ],
                [ "email-personalData-phoneTitle", form.phone ]
            ];
            for (let i = 0; i < personalData.length; ++i) {
                let id       = personalData[i][0];
                let value    = personalData[i][1];
                let tableRow = Tools.getHTMLElementById(id, htmlPersonalData);
                tableRow.children[0].textContent = this.#i18nRef.get(id);
                if (tableRow.children.length >= 2) {
                    tableRow.children[1].textContent = value;
                }
            }

            // Set message
            let htmlMessage = Tools.getHTMLElementById("message", htmlEmail);
            Tools.getHTMLElementsByClassName("subtitle", htmlMessage)[0].textContent = this.#i18nRef.get("email-messageTitle");
            let htmlMessageValue = Tools.getHTMLElementById("message-value", htmlMessage);
            if (form.message === "") {
                htmlMessageValue.innerHTML = `<span class="emptyField">${this.#i18nRef.get("email-noEntries")}</span>`;
            }
            else {
                let formMessage = form.message;
                if (!this.#configRef.email.messageAllowHTML) {
                    formMessage = Tools.stripTags(formMessage);
                }
                formMessage = formMessage.replace(/(?:\r\n|\r|\n)/g, '<br>'); // User <br> for new lines (required); windows: \r\n; linux: \n; macOS: \r
                htmlMessageValue.innerHTML = `<div id="messageField">${formMessage}</div>`;
            }

            // Set print jobs:
            // Set subtitle:
            let htmlPrintJobs = Tools.getHTMLElementById("printJobs", htmlEmail);
            Tools.getHTMLElementsByClassName("subtitle", htmlPrintJobs)[0].textContent = this.#i18nRef.get("email-printJobTitle");
            // Set Print jobs:
            let htmlPrintJobList = Tools.getHTMLElementsByClassName("printJobs-value", htmlPrintJobs)[0];

            if (printJobs.length > 0) 
            {
                let printJobNumber = 1;
                for (const printJob of printJobs) 
                {
                    let fileName = "";
                    if (printJob.files.length > 0) {
                        for (const file of printJob.files) {
                            fileName += file.name + ", ";
                        }
                        fileName = fileName.slice(0, fileName.length - 2); // slice last two characters (", ")
                    }

                    let emailPrintJob = Tools.getHTMLElementByString(this.#htmlCacheRef.get("EmailPrintJob"), Tools.HTMLElementSearchType.tag, "table");
                    let tableData = [ 
                        [ "email-printJob-title",          "" ], 
                        [ "email-printJob-fileTitle",      fileName ], 
                        [ "email-printJob-countTitle",     printJob.count ],
                        [ "email-printJob-formatTitle",    this.#i18nRef.get(printJob.format) ], 
                        [ "email-printJob-paperTypeTitle", this.#i18nRef.get(printJob.paperType) ], 
                        [ "email-printJob-colorTitle",     (printJob.color ? this.#i18nRef.get("email-printJob-color-yes") : this.#i18nRef.get("email-printJob-color-no")) ]
                    ];
                    for (let i = 0; i < tableData.length; ++i) {
                        let id       = tableData[i][0];
                        let value    = tableData[i][1];
                        let tableRow = Tools.getHTMLElementById(id, emailPrintJob);
                        if (id == "email-printJob-title") {
                            tableRow.children[0].textContent = printJobNumber + ". " + this.#i18nRef.get(id);
                        }
                        else {
                            tableRow.children[0].textContent = this.#i18nRef.get(id);
                        }
                        if (tableRow.children.length >= 2) {
                            tableRow.children[1].textContent = value;
                        }
                    }

                    htmlPrintJobList.appendChild(emailPrintJob);
                    ++printJobNumber;
                }
            }
            else {
                htmlPrintJobList.innerHTML = `<span class="emptyField">${this.#i18nRef.get("email-noEntries")}</span>`;
            }

            // Add CSS:
            await this.#addCSS(htmlEmail);

            // Set body
            body = Tools.outerHTML(htmlEmail);
        }

        // Set subject:
        let subject = this.#i18nRef.get("email-subject");

        // Upload form data to server:
        // (server will send the email)
        Tools.uploadForm(
            new Map([
                ["from", form.email],
                ["fromName", form.name],
                ["subject", subject],
                ["body", body],
                ["cf-turnstile-response", form.captcha],
            ]),
            "attachments", this.#printJobList.getFiles(),
            "server/functions/sendEMail.php"
        ).then(response => {
            console.log("Server response: " + response);
            this.#messageBusRef.send(Message.endSendingEmail);
        });

        // Notify everyone about email sending start:
        // To send a mail with 10MB attachments took ~15sec on my system, so 1MB needs 1.5sec.
        {
            let attachmentSizeInMB    = this.#printJobList.getAttachmentsMemorySize() / 1000000;
            let mbUploadDurationInSec = 1.5;
            let expectedTime          = attachmentSizeInMB * mbUploadDurationInSec;
            this.#messageBusRef.send(Message.startSendingEmail, expectedTime);
        }

        // Reset form
        // Must be after I calculate the attachment memory size.
        this.#printJobList.reset();
        this.#htmlElem.reset(); // reset form here and not in html, because of captcha.
    }

    async #addCSS(element)
    {
        // Init CSS:
        // Attention: CSS needs to be inline, because not all email clients support other CSS (e.g. web.de is okay, gmail and ionos is not).
        let css = "";
        {
            const emailStyleResponse = await fetch("assets/emailCSS.json");
            css                      = await emailStyleResponse.json();
        }

        // Check inline CSS
        // see for naming convention: https://www.w3schools.com/css/css_syntax.asp
        for (const [selector, selectorValue] of Object.entries(css)) {
            let typeCount = 0;
            for (const [property, propertyValue] of Object.entries(selectorValue)) {
                if (property === "type") {
                    ++typeCount;
                }
            }
            Tools.assert(typeCount === 1); 
        }

        for (const [selector, selectorValue] of Object.entries(css)) 
        {
            let type = selectorValue.type;
            
            if (type !== "unknown") {
                let selectorElements = Tools.getHTMLElements(type, selector, element, false); // disable assert, because not all CSS selectors must exist in HTML (see message)
                for (const selectorElement of selectorElements) {
                    Tools.appendInlineCSS(selectorElement, css[selector]);
                }
            }
            else {
                // ...process special selectors

                const applyTRStyle = function(isEven) {
                    let tables = Tools.getHTMLElementsByTagName("table", element);
                    for (const table of tables) {
                        let rows = Tools.getHTMLElementsByTagName("tr", table);
                        for (let i = 0; i < rows.length; ++i) {
                            if (isEven && i % 2 == 0) {
                                Tools.appendInlineCSS(rows[i], css["tr:nth-child(even)"]);
                            }
                            else if (!isEven && i % 2 != 0) {
                                Tools.appendInlineCSS(rows[i], css["tr:nth-child(odd)"]);
                            }
                        }
                    }
                };

                switch (selector)
                {   
                    case "tr:nth-child(even)": {
                        applyTRStyle(true);
                    } break;
                    case "tr:nth-child(odd)": {
                        applyTRStyle(false);
                    } break;
                }
            }
        }
    }

    #addPrintJob()
    {
        this.#printJobList.add();
    }

    #onMessage(message, data)
    {
        if (message === Message.languageChanged)
        {
            this.#htmlTitle.textContent        = this.#i18nRef.get("form-title");       
            this.#htmlSubtitle.textContent     = this.#i18nRef.get("form-subtitle");    
            this.#htmlDescription.innerHTML    = this.#i18nRef.get("form-description"); 
            this.#htmlNameInput.placeholder    = this.#i18nRef.get("form-name");   
            this.#htmlEmailInput.placeholder   = this.#i18nRef.get("form-email");  
            this.#htmlPhoneInput.placeholder   = this.#i18nRef.get("form-phone");  
            this.#htmlMessageInput.placeholder = this.#i18nRef.get("form-message");
            this.#htmlSubmitBtn.textContent    = this.#i18nRef.get("form-submitButton");

            /**
             * %20          = " "
             * &amp;        = &
             * %0D%0A%0D%0A = \n
             */
            let urlSubject = this.#i18nRef.get("email-subject");
            urlSubject.replace(" ", "%20");
            let body = "";
            
            if (this.#configRef.mailTo.useDefaultBody) {
                body = `${this.#i18nRef.get("email-personalDataTitle")}:
                    ${this.#i18nRef.get("email-personalData-nameTitle")}: (${this.#i18nRef.get("optional")})
                    ${this.#i18nRef.get("email-personalData-emailTitle")}: (${this.#i18nRef.get("optional")})
                    ${this.#i18nRef.get("email-personalData-phoneTitle")}: (${this.#i18nRef.get("optional")})

                    ${this.#i18nRef.get("email-messageTitle")}:
                    (${this.#i18nRef.get("optional")})

                    ${this.#i18nRef.get("email-printJobTitle")}:

                    1. ${this.#i18nRef.get("email-printJob-title")}
                    ${this.#i18nRef.get("email-printJob-fileTitle")}: ?
                    ${this.#i18nRef.get("email-printJob-countTitle")}: 1
                    ${this.#i18nRef.get("email-printJob-formatTitle")}: ${this.#i18nRef.get("form-printJob-format-a4")}
                    ${this.#i18nRef.get("email-printJob-paperTypeTitle")}: ${this.#i18nRef.get("form-printJob-paperType-standard")}
                    ${this.#i18nRef.get("email-printJob-colorTitle")}: ${this.#i18nRef.get("email-printJob-color-no")}
                `;
                body = encodeURI(body);
            }
            
            // Find: <span class=\" [insert-emailSymbol | insert-emailLink ]\"></span> OR
            //       <a class=\"insert-emailLink\"> My text </span>
            // Example text: "form-description": "Alternativ zu dem Formular können Sie uns auch eine Email <span class=\"insert-emailSymbol\"></span> schicken. Fügen Sie dazu einfach die zu druckenden Dateien bei<br>und schreiben kurz dazu wie sie was ausgedruckt haben möchten."
            let mailSymbolInserts = Tools.getHTMLElementsByClassName("insert-emailSymbol", this.#htmlDescription, false);
            if (mailSymbolInserts.length > 0) { // mail symbol is optional
                mailSymbolInserts[0].innerHTML = `
                    <a  href="mailto:${this.#configRef.mailTo.address}?subject=${urlSubject}&amp;body=${body}">
                        <svg class="centerSymbol" width="24" height="24"><use xlink:href="#mail-symbol"></use></svg>
                    </a>
                `;
            }

            let mailLinkInserts = Tools.getHTMLElementsByClassName("insert-emailLink", this.#htmlDescription, false);
            if (mailLinkInserts.length > 0) { // mail symbol is optional
                mailLinkInserts[0].href = `mailto:${this.#configRef.mailTo.address}?subject=${urlSubject}&amp;body=${body}`;
            }
        }
    }
}