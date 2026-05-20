import ExcelJS from 'exceljs';

async function run() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Test');
  sheet.columns = [
    { header: 'ColA', key: 'a' },
    { header: 'ColB', key: 'b' }
  ];
  const row = sheet.addRow({ a: 'Test', b: '' });

  // Create a 1x1 png base64
  const b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
  const imgId = workbook.addImage({
    buffer: Buffer.from(b64, 'base64'),
    extension: 'png'
  });

  row.height = 60;
  sheet.addImage(imgId, {
    tl: { col: 1, row: row.number - 1 },
    ext: { width: 50, height: 50 }
  });
  
  await workbook.xlsx.writeFile('test.xlsx');
  console.log('done');
}
run();
