"use strict";

import { MessageBus, Message } from "./Core/MessageBus.js";
import { I18n } from "./Core/I18n.js";
import { StateMachine } from "./Core/StateMachine.js";
import * as Tools from "./Core/Tools.js";
import { HTMLCache } from "./Core/HTMLCache.js"
import { EmailLoadingState } from "./State/EmailLoadingState/EmailLoadingState.js"
import { AppLoadingState } from "./State/AppLoadingState/AppLoadingState.js";
import { FormState } from "./State/FormState/FormState.js";
import { EmailConfirmationState } from "./State/EmailConfirmationState/EmailConfirmationState.js";

class App
{
    #i18n;
    #messageBus;
    #config;
    #stateMachine;
    #htmlCache;

    #appLoadingState;
    #formState;
    #htmlState;
    #emailLoadingState;
    #emailConfirmationState;

    constructor()
    {
        this.#htmlState              = Tools.getHTMLElementById("state");
        this.#stateMachine           = new StateMachine;

        this.#appLoadingState        = new AppLoadingState(this.#htmlState);
        this.#stateMachine.change(this.#appLoadingState);

        this.#config                 = {};
        this.#htmlCache              = new HTMLCache;
        this.#messageBus             = new MessageBus;
        this.#i18n                   = new I18n(this.#messageBus);
        this.#formState              = {};
        this.#emailLoadingState      = {};
        this.#emailConfirmationState = {};

        this.#messageBus.add(this.#onMessage.bind(this));
    }

    async init()
    {
        //await sleep(2000); // simulate slow pc

        // Load config:
        const response = await fetch("assets/config.json");
        this.#config   = await response.json(); // does already 'JSON.parse(json);'

        await this.#loadHTMLResources();

        // Init states:
        this.#formState              = new FormState(this.#config, this.#i18n, this.#messageBus, this.#htmlState, this.#htmlCache);
        this.#emailLoadingState      = new EmailLoadingState(this.#i18n, this.#messageBus, this.#htmlState);
        this.#emailConfirmationState = new EmailConfirmationState(this.#i18n, this.#messageBus, this.#htmlState);
        // Do not call 'this.init();' in the respective constructors, but in here in main.js before the language is loaded. Otherwise language file could be loaded before State is initialized.
        await this.#formState.init(this.#htmlCache);
        await this.#emailLoadingState.init(this.#htmlCache); 
        await this.#emailConfirmationState.init(this.#htmlCache);

        // Load language:
        this.#i18n.load(this.#config.language).then(() => {
            this.#messageBus.send(Message.languageChanged);
        });

        // Change state:
        this.#stateMachine.change(this.#formState);
    }

    async #loadHTMLResources()
    {
        await this.#htmlCache.add("EmailConfirmationState", "src/State/EmailConfirmationState/EmailConfirmationState.html");
        await this.#htmlCache.add("EmailLoadingState", "src/State/EmailLoadingState/EmailLoadingState.html");
        await this.#htmlCache.add("ErrorMessage", "src/State/FormState/ErrorMessage.html");
        await this.#htmlCache.add("FormState", "src/State/FormState/FormState.html");
        await this.#htmlCache.add("PrintJob", "src/State/FormState/PrintJob.html");
        await this.#htmlCache.add("EmailPrintJob", "src/State/FormState/EmailPrintJob.html");
        await this.#htmlCache.add("Email", "src/State/FormState/Email.html");
    }

    #onMessage(message, data)
    {
        if (message == Message.emailIsBeingPrepared)
        {
            this.#stateMachine.change(this.#appLoadingState);
        }

        if (message === Message.startSendingEmail)
        {
            this.#stateMachine.change(this.#emailLoadingState);
            let expectedTime = data;
            this.#emailLoadingState.startLoadingAnimation(expectedTime);
        }

        if (message === Message.emailLoadingFinished)
        {
            this.#stateMachine.change(this.#emailConfirmationState);
        }

        if (message === Message.emailConfirmationClosed)
        {
            this.#stateMachine.change(this.#formState);
        }
    }
}

var app = new App(); // Wordpress can only use this object if it is declared as "var", not "let".
app.init();