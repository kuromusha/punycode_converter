/*
 * Copyright (C) 2022  Ken'ichi Kuromusha
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

function encode() {
    let text = document.input_form.input_text.value;
    for (let i = 0; i < text.length; i++) {
        if (text.charCodeAt(i) >= 0x80) {
            return document.input_form.output_text.value = _to_puny(text);
        }
    }
    document.input_form.output_text.value = _from_puny(text);
}

function _from_puny(s) {
    let ret = '';
    for (let i = index = 0; ;) {
        for (; index + 3 < s.length; index++) {
            if (s.substr(index, 4).toLowerCase() == 'xn--') {
                break;
            }
        }
        if (index + 3 < s.length) {
            if (index > i) {
                ret += s.substr(i, index - i);
                i = index;
            }
            for (index += 4; index < s.length; index++) {
                let c = s.charCodeAt(index);
                if (c != 0x2d && c < 0x30 || c > 0x39 && c < 0x41 || c > 0x5a && c < 0x61 || c > 0x7a) {
                    break;
                }
            }
            let c = index - i - 4;
            if (c > 0) {
                try {
                    ret += punycode.decode(s.substr(i + 4, c));
                } catch (e) {
                }
                i = index;
            } else {
                ret += s.substr(i, 4);
                i += 4;
            }
        } else {
            ret += s.substr(i, s.length - i);
            break;
        }
    }
    return ret;
}

function _to_puny(s) {
    let i, index, mode, ret = '';
    for (i = index = mode = 0; i < s.length; i++) {
        let c = s.charCodeAt(i);
        if (c != 0x2d && c < 0x30 || c > 0x39 && c < 0x41 || c > 0x5a && c < 0x61 || c > 0x7a && c <= 0x7f) {
            if (mode != 0) {
                let tmp = s.substr(index, i - index);
                if (mode == 2) {
                    tmp = 'xn--' + punycode.encode(tmp);
                }
                ret += tmp;
                index = i;
                mode = 0;
            }
        } else {
            if (mode == 0) {
                ret += s.substr(index, i - index);
                index = i;
                mode = 1;
            }
            if (c > 0x7f) {
                mode = 2;
            }
        }
    }
    if (mode != 2) {
        ret += s.substr(index, i - index);
    } else {
        ret += 'xn--' + punycode.encode(s.substr(index, i - index));
    }
    return ret;
}

function clipCopyText() {
    if (window.clipboardData) {
        clipboardData.setData('Text', document.input_form.output_text.value);
    } else if (navigator.clipboard) {
        navigator.clipboard.writeText(document.input_form.output_text.value);
    }
}

window.onload = function () {
    document.input_form.input_text.focus();
    encode();
}
