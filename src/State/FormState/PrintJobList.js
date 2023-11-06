"use strict";

import { Message } from "../../Core/MessageBus.js";
import * as Tools from "../../Core/Tools.js";

export class PrintJob
{
    files;
    count;
    format;
    paperType;
    color;

    constructor()
    {
        this.files     = [];
        this.count     = 1;
        this.format    = "A4";
        this.paperType = "Standard";
        this.color     = false;
    }
    
    fromHTML(htmlPrintJob)
    {
        this.files     = Tools.getHTMLElementsByClassName("form-file", htmlPrintJob)[0].files;
        this.count     = Tools.getHTMLElementsByClassName("form-count", htmlPrintJob)[0].value;
        this.format    = Tools.getHTMLElementsByClassName("form-format", htmlPrintJob)[0].value;
        this.paperType = Tools.getHTMLElementsByClassName("form-paperType", htmlPrintJob)[0].value;
        this.color     = Tools.getHTMLElementsByClassName("form-color", htmlPrintJob)[0].checked;
        
        if (this.count === "") {
            this.count = 1;
        }
    }
}

export class PrintJobList
{
    #htmlCacheRef;
    #i18nRef;
    #htmlElem;
    #printJobs;

    constructor(i18nRef, messageBusRef, htmlCacheRef)
    {
        this.#htmlCacheRef = htmlCacheRef;
        this.#i18nRef      = i18nRef;
        this.#htmlElem     = {};
        this.#printJobs    = [];

        messageBusRef.add(this.#onMessage.bind(this));
    }

    init(htmlForm, configRef)
    {
        this.#htmlElem = Tools.getHTMLElementById("printJobList", htmlForm);
        
        // Add default print jobs
        if (typeof configRef.defaultPrintJobCount !== "undefined" && configRef.defaultPrintJobCount !== null) {
            for (let i = 0; i < configRef.defaultPrintJobCount; ++i) {
                this.add();
            }
        }
    }

    add()
    {
        let printJob = Tools.getHTMLElementByString(this.#htmlCacheRef.get("PrintJob"), Tools.HTMLElementSearchType.class, "printJob");

        // Set events:

        let closeBtn = Tools.getHTMLElementsByClassName("closeBtn", printJob)[0];
        closeBtn.addEventListener("click", (function() { this.remove(closeBtn); }).bind(this));

        let fileUpload = Tools.getHTMLElementsByClassName('form-file', printJob)[0];
        fileUpload.addEventListener("change", this.#loadTexts.bind(this));

        let fileUploadBtn = Tools.getHTMLElementsByClassName('fileUploadBtn', printJob)[0];
        fileUploadBtn.addEventListener("click", (function() { this.#onClickFileUploadSubstitute(fileUploadBtn); }).bind(this));

        // Other:

        let fileSubstitute = Tools.getHTMLElementsByClassName("form-fileSubstitute", printJob)[0];
        fileSubstitute.setAttribute("form-fileSubstitute-text", "0 Dateien");

        this.#htmlElem.appendChild(printJob);

        this.#loadTexts();
    }

    #onClickFileUploadSubstitute(elem)
    {
        let fileUpload = Tools.getHTMLElementsByClassName('form-file', elem.parentNode)[0];
        fileUpload.click();
    }

    remove(closeBtn)
    {
        let printJob = closeBtn.parentElement.parentElement;
        this.#htmlElem.removeChild(printJob);
    }

    /**
     * May only be called once submit was pressed, because if this is called afterwards, the files can not be received again.
     * @return print jobs
     */
    fetchHTML()
    {
        this.#printJobs = []; // clear print jobs
        let htmlPrintJobs = this.#htmlElem.getElementsByClassName("printJob"); // Do not use the strict 'Tools.getHTMLElementsByClassName' function here.
        for (const htmlPrintJob of htmlPrintJobs) {
            let newPrintJob = new PrintJob();
            newPrintJob.fromHTML(htmlPrintJob);
            this.#printJobs.push(newPrintJob);
        }

        return this.#printJobs;
    }

    /**
     * 
     * @returns memory size of all attachments in byte.
     */
    getAttachmentsMemorySize()
    {
        let size = 0;
        for (const printJob of this.#printJobs) {
            for (const file of printJob.files) {
                size += file.size;
            }
        }
        return size;
    }

    get()
    {
        return this.#printJobs;
    }

    getFiles()
    {
        let files = [];
        for (const printJob of this.#printJobs) {
            for (const file of printJob.files) {
                files.push(file);
            }
        }
        return files;
    }

    reset()
    {
        this.#printJobs = [];
        this.#htmlElem.innerHTML = "";
    }

    #loadTexts()
    {
        let htmlPrintJobs = this.#htmlElem.getElementsByClassName("printJob"); // Do not use the strict 'getHTMLElementsByClassName' function here.
        for (const htmlPrintJob of htmlPrintJobs) {
            Tools.getHTMLElementsByClassName("title", htmlPrintJob)[0].textContent          = this.#i18nRef.get("form-printJob-title");

            Tools.getHTMLElementsByClassName("fileTitle", htmlPrintJob)[0].textContent      = this.#i18nRef.get("form-printJob-fileTitle");
            Tools.getHTMLElementsByClassName("countTitle", htmlPrintJob)[0].textContent     = this.#i18nRef.get("form-printJob-countTitle");
            Tools.getHTMLElementsByClassName("formatTitle", htmlPrintJob)[0].textContent    = this.#i18nRef.get("form-printJob-formatTitle");
            Tools.getHTMLElementsByClassName("paperTypeTitle", htmlPrintJob)[0].textContent = this.#i18nRef.get("form-printJob-paperTypeTitle");
            Tools.getHTMLElementsByClassName("colorTypeTitle", htmlPrintJob)[0].textContent = this.#i18nRef.get("form-printJob-colorTypeTitle");

            Tools.getHTMLElementsByClassName("fileUploadBtn", htmlPrintJob)[0].value        = this.#i18nRef.get("form-printJob-fileUploadBtn-value");
            { // Load fileUploadBtn text:
                let fileUpload = Tools.getHTMLElementsByClassName('form-file', htmlPrintJob)[0];
                let text = fileUpload.files.length;
                if (fileUpload.files.length == 1) {
                    text += " " + this.#i18nRef.get("form-printJob-fileUploadBtn-fileSingular");
                }
                else {
                    text += " " + this.#i18nRef.get("form-printJob-fileUploadBtn-filePlural");
                }
                Tools.getHTMLElementsByClassName("form-fileSubstitute", htmlPrintJob)[0].setAttribute("form-fileSubstitute-text", text);
            }
            { // Load format dropdownMenu text:
                let dropdownMenu = Tools.getHTMLElementsByClassName('form-format', htmlPrintJob)[0];
                for (let i = 0; i < dropdownMenu.length; ++i) {
                    let option = dropdownMenu[i];
                    option.textContent = this.#i18nRef.get(option.value);
                }
            }
            { // Load paper type dropdownMenu text:
                let dropdownMenu = Tools.getHTMLElementsByClassName('form-paperType', htmlPrintJob)[0];
                for (let i = 0; i < dropdownMenu.length; ++i) {
                    let option = dropdownMenu[i];
                    option.textContent = this.#i18nRef.get(option.value);
                }
            }

            Tools.getHTMLElementsByClassName("fileHelpText", htmlPrintJob)[0].textContent      = this.#i18nRef.get("form-printJob-fileHelpText");
            Tools.getHTMLElementsByClassName("countHelpText", htmlPrintJob)[0].textContent     = this.#i18nRef.get("form-printJob-countHelpText");
            Tools.getHTMLElementsByClassName("formatHelpText", htmlPrintJob)[0].textContent    = this.#i18nRef.get("form-printJob-formatHelpText");
            Tools.getHTMLElementsByClassName("paperTypeHelpText", htmlPrintJob)[0].textContent = this.#i18nRef.get("form-printJob-paperTypeHelpText");
            Tools.getHTMLElementsByClassName("colorTypeHelpText", htmlPrintJob)[0].textContent = this.#i18nRef.get("form-printJob-colorTypeHelpText");
        }
    }

    #onMessage(message, data)
    {
        if (message === Message.languageChanged)
        {
            this.#loadTexts();
        }
    }
}