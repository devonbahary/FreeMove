const express = require('express');

const app = express();

app.use(express.static('rpgmakermv'));

app.listen(3000, () => console.log('Started server on port 3000.'));
