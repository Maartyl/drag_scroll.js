coffee -c scroll_drag.coffee &&
mv scroll_drag.js scroll_drag.user.js
cat header.js scroll_drag.user.js | xcs &&
xcg > scroll_drag.user.js
