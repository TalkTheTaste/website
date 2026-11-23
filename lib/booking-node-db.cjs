// Node preview uses SQLite; production Pages uses the same queries through D1.
const {DatabaseSync}=require('node:sqlite');
module.exports=filename=>{const db=new DatabaseSync(filename);return {exec:async sql=>db.exec(sql),prepare(sql){let args=[];return {bind(...values){args=values;return this;},async first(){return db.prepare(sql).get(...args)||null;},async run(){const result=db.prepare(sql).run(...args);return {meta:{changes:Number(result.changes)}};}};}};};
