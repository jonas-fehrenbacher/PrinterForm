"use strict";

export function assert(condition/*: bool*/, message/*: string*/) /*: void*/
{
    if (!condition) {
        throw new Error(message || "Assertion failed");
    }
}

export function stripTags(str) {
    if (str === null || str === '')
        return false;
    else
        str = str.toString(); // The toString() method can be used to convert a string object into a string.
          
    // Regular expression to identify HTML tags in
    // the input string. Replacing the identified
    // HTML tag with a null string.
    return str.replace( /(<([^>]+)>)/ig, '');
}

export function sleep(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}

export function format(formatStr, ...args) /*: string*/
{
    // [1] Check:
    for (let i = 0; i < args.length; ++i) {
        assert(formatStr.includes("{" + i + "}"));
    }
    
    // [2] Insert:
    for (let i = 0; i < args.length; ++i) {
        formatStr = formatStr.replace("{" + i + "}", args[i]);
    }

    return formatStr;
}

/**
 * '.outerHTML' is not be cross browser, instead use this function.
 * Beaware that is makes a deep copy and is expensive on large DOM trees.
 * See: https://stackoverflow.com/questions/1763479/how-to-get-the-html-for-a-dom-element-in-javascript
 */
export function outerHTML(element) 
{
    let container = document.createElement("div");
    container.appendChild(element.cloneNode(true));
    return container.innerHTML;
}

export function setInlineCSS(element, styleObj)
{
    element.style.cssText = "";
    appendInlineCSS(element, styleObj);
}

export function appendInlineCSS(element, styleObj)
{
    let inlineCSS = "";
    for (const [key, value] of Object.entries(styleObj)) {
        if (key === "type") continue; // Special value, which is no CSS, but required
        inlineCSS += key + ":" + value + ";";
    }
    element.style.cssText += inlineCSS;
}

/*////////////////////////////////////////////////////////////////////////////////////
    Form
////////////////////////////////////////////////////////////////////////////////////*/

export async function uploadForm(fieldMap/*: Map */, fileArrayName, files, destinationURL)
{
    /**
     * Sending attachments with '"&attachments=" + attachments' or inside a json string does not work,
     * so I'm using 'FormData'.
     * Sending data examples:
     *  1) JS:  request.send("to=" + to + "&from=" + from);
     *     PHP: $to = isset($_POST["to"]) ? $_POST["to"] : "unknown";
     *  2) JS:  request.send("jsonData=" + JSON.stringify({ to: to, from: from }));
     *     PHP: $data = isset($_POST["jsonData"]) ? json_decode($_POST["jsonData"], true) : [];
     *  3) JS:  let formData = new FormData(); formData.append("to", to); request.send(formData);
     *          The following may not be used: 'request.setRequestHeader("Content-type", "application/x-www-form-urlencoded")'!
     *     PHP: $_FILES["attachments"]
     * @see https://developer.mozilla.org/en-US/docs/Web/API/FormData/Using_FormData_Objects
     */
    return new Promise((resolve, reject) => {
        try {
            const formData = new FormData();
            for (let [key, value] of fieldMap) {
                formData.append(key, value);
            }
            for (const file of files) {
                // file.size returns size in bytes
                formData.append(fileArrayName + "[]", file, file.name);
            }
            const request = new XMLHttpRequest();
            request.onload = function () {
                // ..request has been successfully completed
                resolve(this.responseText);
            };
            request.open("POST", destinationURL);
            request.send(formData);
        }
        catch(e) {
            reject(e); // return 'e' on error..
        }
    });
}

/*////////////////////////////////////////////////////////////////////////////////////
    Get HTML Elements
////////////////////////////////////////////////////////////////////////////////////*/

export var HTMLElementSearchType = {
    id:    "id",
    class: "class",
    tag:   "tag",
    name:  "name"
}

export async function getHTMLElementByFile(filepath, searchType, name) /*: Promise<HTMLElement>*/
{
    assert(/^(\/?[a-z0-9]+)+$/.test(filepath));
    const response            = await fetch(filepath);
    const htmlStr             = await response.text();
    return getHTMLElementByString(htmlStr, searchType, name);
}

export function getHTMLElementByString(htmlStr, searchType, name) /*: HTMLElement*/
{
    const htmlElemWrapper     = document.createElement("div");
    htmlElemWrapper.innerHTML = htmlStr;

    let htmlElem = {};
    switch (searchType)
    {
        case HTMLElementSearchType.id:    htmlElem = getHTMLElementById(name, htmlElemWrapper); break;
        case HTMLElementSearchType.class: htmlElem = getHTMLElementsByClassName(name, htmlElemWrapper)[0]; break;
        case HTMLElementSearchType.tag:   htmlElem = getHTMLElementsByTagName(name, htmlElemWrapper)[0]; break;
        case HTMLElementSearchType.name:  htmlElem = getHTMLElementsByName(name, htmlElemWrapper)[0]; break;
    }

    return htmlElem;
}

export function getHTMLElements(searchType, name, parent = document, useAssert = true) /*: HTMLElement[]*/
{
    let htmlElems = [];
    switch (searchType)
    {
        case HTMLElementSearchType.id:    {
            let htmlElem = getHTMLElementById(name, parent, useAssert);
            if (htmlElem) {
                htmlElems.push(htmlElem);
            }
        } break;
        case HTMLElementSearchType.class: htmlElems = getHTMLElementsByClassName(name, parent, useAssert); break;
        case HTMLElementSearchType.tag:   htmlElems = getHTMLElementsByTagName(name, parent, useAssert); break;
        case HTMLElementSearchType.name:  htmlElems = getHTMLElementsByName(name, parent, useAssert); break;
        default: assert(false, "Unknow search type!");
    }

    return htmlElems;
}

/**
 * Is a strict alternative to 'document.getElementById()' - it throws if element was not found.
 */
export function getHTMLElementById(id, parent = document, useAssert = true) /*: HTMLElement | null*/
{
    let htmlElement = null;
    if (parent == document) {
        htmlElement = document.getElementById(id);
    }
    else {
        let allElements = getHTMLElementsByTagName("*", parent);
        for (const elem of allElements) {
            if (elem.getAttribute("id") == id) {
                htmlElement = elem;
            }
        }
    }
    assert(!useAssert || htmlElement !== null);
    return htmlElement;
}

/**
 * Is a strict alternative to 'getElementsByClassName()' - it throws if element was not found.
 */
export function getHTMLElementsByClassName(name, parent = document, useAssert = true) /*: HTMLElement[]*/
{
    let htmlElements = parent.getElementsByClassName(name);
    assert(!useAssert || htmlElements.length > 0);
    return htmlElements;
}

/**
 * Is a strict alternative to 'getElementsByTagName()' - it throws if element was not found.
 */
export function getHTMLElementsByTagName(name, parent = document, useAssert = true) /*: HTMLElement[]*/
{
    let htmlElements = parent.getElementsByTagName(name);
    assert(!useAssert || htmlElements.length > 0);
    return htmlElements;
}

/**
 * Is a strict alternative to 'getElementsByName()' - it throws if element was not found.
 */
export function getHTMLElementsByName(name, parent = document, useAssert = true) /*: HTMLElement[]*/
{
    let htmlElements = parent.getElementsByName(name);
    assert(!useAssert || htmlElements.length > 0);
    return htmlElements;
}

/**
 * Get your html elements from the DOM and afterwards check if they exist.
 */
export function existHTMLElements(htmlElements /*: HTMLElement[] */) /*: bool*/
{
    for (const htmlElement of htmlElements) {
        /** 
         * 'undefined' can be triggered by 'document.getElementsByClassName("myClass")[0]' and
         * 'null' can be triggered by 'document.getElementById("myID")'.
         */
        if (htmlElement === null || htmlElement === undefined) {
            return false;
        }
    }
    return true;
}