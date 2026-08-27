const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');

code = code.replace(
  /        res\.json\(\{ success: true, abt_km, pTravelDistance: pTravel\.distance \}\);\n      \} catch \(e: any\) \{/g,
  `        }
        res.json({ success: true, abt_km, pTravelDistance: pTravel.distance });
      } catch (e: any) {`
);

fs.writeFileSync('src/server.ts', code);
