#Important files#

*   www/js/main.js is the glue that tights all the things together and makes the logic flows.

    This is the place where you write code to bind events, change styling and everything related to the pages. Every other js file is to provide functions to be used in this file. As the file grows, it might be worth to split this file into several pieces, each corresponding to a specific page.

---------------------------------------

*   www/js/service.js contains the function to send requests.

    It wraps the jQuery ajax function by specifying an end point. Depending on whether a request is using file protocol, in that case it is running on a device and without the limitation of cross-domain policies, the end point is set to be the actual server address or a local proxy PHP file. The PHP file at root directory is useful for the cross-domain issues when debugging on a desktop browser. 

---------------------------------------

*   index.html is the single only entrance to the project. 

    Due to the JQM framework, the header of this page is used when visiting every other page. That means, to include a js file for a.html, where a is a different page from index, one has to either append a script tag with appropriate src in header of index.html, even though the reference is used only on a.html, or, use js to dynamically load the reference when needed. Moreover, when directly accessing any other page, one will be redirected back to index.html by the js/reroute.js.

For more detailed explanations, please find in in-line comments of each file.

#Principles#

1.   Constants and Strings are defined on top of main.js. Using a reference avoids potential errors that can occur when changing one with multiple occurrences.

2.   An HTML element with ux-data attribute means that it has dynamic content. The attribute is defined in js/setData.js.

3.   Classes that have prefix of ux- indicate the marked element may be handled by javascript. These classes serve as only an indicator, and should not be related to any styling rules. This adds a separation to the view and controller.

4.   When processing returned data, added/modified fields have an underscore ‘_’ to indicate the field of data does not originate from the server.
