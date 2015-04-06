var formatSize = function(size) {
    if (size > 1000*1000) {
        size = (size / (1000 * 1000)).toFixed(2) + "TB";

    } else if (size > 1000) {
        size = (size / 1000).toFixed(2) + "GB";
    } else {
        size = size + "MB";
    }
    return size;
}

var formatBool = function(boolValue) {
    if (boolValue == 1 || boolValue == true) {
        return "Yes";
    } else {
        return "No";
    }
}

var truncate = function(s) {
    if (s && s.length > 44) {
        return s.substr(0, 44);
    }
    return s;
}

var textClass = function(val, warning, danger) {
    if (val < danger) {
        return "text-danger";
    } else if (val < warning) {
        return "text-warning";
    } else {
        return "";
    }
}

module.exports = {
    formatSize: formatSize,
    formatBool: formatBool,
    truncate: truncate,
    textClass: textClass
};
