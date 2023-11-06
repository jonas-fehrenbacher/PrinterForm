"use strict";

import * as Tools from "../../Core/Tools.js";
import { Navigation } from "./Navigation.js";
import { PrinterForm } from "./PrinterForm.js"

export class FormState
{
    #configRef;
    #i18nRef;
    #messageBusRef;
    #navigation;
    #printerForm;
    #htmlFormState;
    #htmlStateRef;

    constructor(configRef, i18nRef, messageBusRef, htmlStateRef, htmlCacheRef)
    {
        this.#configRef     = configRef;
        this.#htmlStateRef  = htmlStateRef;
        this.#htmlFormState = {};
        this.#navigation    = new Navigation(i18nRef, messageBusRef);
        this.#printerForm   = new PrinterForm(i18nRef, messageBusRef, configRef, htmlCacheRef);
    }

    async init(htmlCacheRef)
    {
        this.#htmlFormState = Tools.getHTMLElementByString(htmlCacheRef.get("FormState"), Tools.HTMLElementSearchType.id, "app");
        await this.#navigation.init(Tools.getHTMLElementsByTagName("nav", this.#htmlFormState)[0], this.#configRef);
        await this.#printerForm.init(Tools.getHTMLElementsByTagName("main", this.#htmlFormState)[0]);
    }

    startState()
    {
        this.#htmlStateRef.appendChild(this.#htmlFormState);

        // Render cloudflare turnsite captcha:
        // Cloudflare can not do this automatically, because it checks when the DOM is loaded if there is a "cf-turnstile"-Div, but
        // I load this div later dynamically, so cloudflare does not know about a captcha element on my site. With this I can tell
        // cloudflare about it.
        // See: https://mediaron.com/developer-diaries-comments-and-cloudflare-turnstile/
        if (typeof turnstile !== "undefined" && turnstile !== null) // I want to debug without 'turnstile'
        {
            turnstile.render('#captcha', {
                sitekey: this.#configRef.captchaSitekey,
                callback: function (token) {
                    //console.log(`Challenge Success ${token}`);
                }
            });
        }
    }

    stopState()
    {
        this.#htmlStateRef.removeChild(this.#htmlFormState);
    }
}