# Nodetopia

NodeJS library for Utopia Ecosystem API

Usage: 
```javascript
var apiClass = new (require("utopia-nodejs-api"))("TOKEN");
apiClass.setProfileStatus("DoNotDisturb", "Understanding Utopia Node.js API").then((data)=>{
    console.info(`Success: ${JSON.stringify(data, null, 4)}`);
}, (error)=>{
    console.info(`Error: ${JSON.stringify(error, null, 4)}`);
});
```

## Installation
`npm i nodetopia`
