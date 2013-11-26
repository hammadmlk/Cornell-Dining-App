function Set(initialData) {
    // can pass initial data for the set in an object
    this.data = initialData || {};
}

Set.prototype = {
    add: function(key, val) {
        if (typeof key === "object") {
            for (var index in key) {
                if (key.hasOwnProperty(index)) {
                    this.add(index, key[index]);
                }
            }
        } else {
            this.data[key] = val;
        }
    },
    get: function(key) {
        return this.data[key];
    },
    remove: function(key) {
        // can be one or more args
        // each arg can be a string key or an array of string keys
        var item;
        for (var j = 0; j < arguments.length; j++) {
            item = arguments[j];
            if (typeof key === "string") {
                delete this.data[item];
            } else if (item.length) {
                // must be an array of keys
                for (var i = 0; i < item.length; i++) {
                    delete this.data[item[i]];
                }
            }
        }
    },
    has: function(key) {
        return Object.prototype.hasOwnProperty.call(this.data, key);
    },
    isEmpty: function() {
        for (var key in this.data) {
            if (this.has(key)) {
                return false;
            }
        }
        return true;
    },
    keys: function() {
        return Object.keys(this.data);
    },
    clear: function() {
        this.data = {}; 
    }
};