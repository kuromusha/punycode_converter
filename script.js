/*
 * Copyright (C) 2022–2026  Ken'ichi Kuromusha
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

'use strict';

const MAX_INPUT = 16384;
const conversionMessages = {
    tooLong: 'Enter no more than 16,384 characters.',
    control: 'Line breaks, tabs, and other control characters are not supported.',
    unicode: 'The input contains invalid Unicode.',
    punycode: 'Invalid Punycode.'
};
let isComposing = false;
let conversionStatus;
let conversionResult;

function checkText(text) {
    if (text.length > MAX_INPUT) throw new Error('tooLong');
    if (/[\u0000-\u001f\u007f]/u.test(text)) throw new Error('control');
    for (let i = 0; i < text.length; i++) {
        const c = text.charCodeAt(i);
        if (c >= 0xd800 && c <= 0xdbff) {
            const next = text.charCodeAt(++i);
            if (!(next >= 0xdc00 && next <= 0xdfff)) throw new Error('unicode');
        } else if (c >= 0xdc00 && c <= 0xdfff) {
            throw new Error('unicode');
        }
    }
}

function encode() {
    if (isComposing) return;
    const form = document.input_form;
    const text = form.input_text.value;
    if (conversionStatus) conversionStatus.textContent = '';
    if (conversionResult) conversionResult.textContent = '';
    form.input_text.removeAttribute('aria-invalid');
    try {
        checkText(text);
        const encoding = /[^\x00-\x7f]/u.test(text);
        form.output_text.value = encoding ? _to_puny(text) : _from_puny(text);
        form.copy_text.disabled = !form.output_text.value;
        if (conversionResult && text) {
            conversionResult.textContent = encoding ? 'Encoded' : 'Decoded';
        }
    } catch (error) {
        form.output_text.value = text;
        form.input_text.setAttribute('aria-invalid', 'true');
        form.copy_text.disabled = true;
        if (conversionStatus) {
            conversionStatus.textContent = (conversionMessages[error.message]
                || 'Conversion failed. Check the input and browser support.')
                + ' The original input has been preserved in the result.';
        }
    }
}

function _from_puny(text) {
    return text.replace(/xn--[A-Za-z0-9-]+/gi, segment => {
        try {
            const decoded = punycode.decode(segment.slice(4));
            checkText(decoded);
            return decoded;
        } catch {
            throw new Error('punycode');
        }
    });
}

function _to_puny(text) {
    // Normalize domain separators while preserving other punctuation and paths.
    return text.replace(/[\u3002\uff0e\uff61]/gu, '.')
        .replace(/[A-Za-z0-9\u0080-\u{10ffff}-]+/gu, segment => {
            if (!/[^\x00-\x7f]/u.test(segment)) return segment;
            try {
                return 'xn--' + punycode.encode(segment);
            } catch {
                throw new Error('punycode');
            }
        });
}

async function clipCopyText() {
    const form = document.input_form;
    if (form.copy_text.disabled) return;
    const value = form.output_text.value;
    try {
        if (window.clipboardData) {
            if (!window.clipboardData.setData('Text', value)) throw new Error('clipboard');
        } else {
            await navigator.clipboard.writeText(value);
        }
        if (conversionStatus && value === form.output_text.value) {
            conversionStatus.textContent = 'Copied.';
        }
    } catch {
        if (value === form.output_text.value) {
            form.output_text.focus();
            form.output_text.select();
            if (conversionStatus) {
                conversionStatus.textContent = 'Copy failed. Select the result and copy it manually.';
            }
        }
    }
}

window.addEventListener('DOMContentLoaded', function () {
    const form = document.input_form;
    const input = form.input_text;
    const output = form.output_text;
    conversionResult = document.createElement('p');
    conversionStatus = document.createElement('p');
    conversionStatus.id = 'conversion_status';
    conversionStatus.setAttribute('role', 'status');
    conversionStatus.setAttribute('aria-atomic', 'true');
    form.appendChild(conversionResult);
    form.appendChild(conversionStatus);
    input.setAttribute('aria-describedby', conversionStatus.id);
    output.setAttribute('aria-describedby', conversionStatus.id);

    // Replace the legacy inline handlers without requiring an HTML change.
    for (const name of ['onkeyup', 'onmousedown', 'onpaste']) input.removeAttribute(name);
    for (const name of ['onclick', 'onkeypress']) form.copy_text.removeAttribute(name);
    output.removeAttribute('onfocus');
    input.addEventListener('compositionstart', () => { isComposing = true; });
    input.addEventListener('compositionend', () => {
        isComposing = false;
        encode();
    });
    input.addEventListener('input', event => {
        if (!event.isComposing) encode();
    });
    form.copy_text.addEventListener('click', clipCopyText);
    output.addEventListener('focus', () => output.select());
    form.addEventListener('submit', event => event.preventDefault());
    input.focus();
    encode();
});
