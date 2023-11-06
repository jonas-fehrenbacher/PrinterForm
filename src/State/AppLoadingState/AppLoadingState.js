"use strict";

import * as Tools from "../../Core/Tools.js";

export class AppLoadingState
{
    #htmlElement;
    #htmlStateRef;

    constructor(htmlStateRef)
    {
        // Load from string, because this must be displayed immediatelly, till the app is initialized.
        this.#htmlStateRef = htmlStateRef;
        this.#htmlElement  = Tools.getHTMLElementByString(`
                <div id="appLoadingState">
                    <div class="circleLoader"></div>
                </div>
            `, 
            Tools.HTMLElementSearchType.id, "appLoadingState"
        );
    }

    startState()
    {
        this.#htmlStateRef.appendChild(this.#htmlElement);
    }

    stopState()
    {
        this.#htmlStateRef.removeChild(this.#htmlElement);
    }
}