const express = require('express');
const path = require('path');

const app = express();
const port = Number(process.env.PORT) || 3000;

const staticDir = path.join(__dirname);
app.use(express.static(staticDir));

app.get('/', (req, res) => {
  res.sendFile(path.join(staticDir, 'index.html'));
});

app.listen(port, () => {
  console.log(`오목 게임이 포트 ${port}에서 실행 중입니다.`);
});
