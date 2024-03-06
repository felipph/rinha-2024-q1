const HyperExpress = require("hyper-express");
const webserver = new HyperExpress.Server({
  fast_buffers: true,
  fast_abort: true,
});
const mysql = require("mysql2");

const connection = mysql.createPool({
  host: "database",
  user: "root",
  password: "root",
  database: "rinha",
  waitForConnections: true,
  connectionLimit: 20,
  maxIdle: 10,
  idleTimeout: 1000,
  queueLimit: 20,
});

function handle_index(request, response) {
  response.send("Hello World");
}

async function handle_transacao(request, response) {
  console.log("Transacao");
  let id = request.path_parameters.id;
  body = await request.json();
  console.log("Transacao: " + JSON.stringify(body));
  saida = {};
  connection.query(
    `call DO_TRANS('${id}', '${body.tipo}', '${body.valor}', '${body.descricao}')`,
    await function (err, results, fields) {
      if(err) {
        response.status(422).send('{}');
        return;
      }      
      if (err == null && results.length > 0) {
        response.status(results[0][0].p_status);
        saida =  '{"limite": ' +
        results[0][0].limite +
        ', "saldo": ' +
        results[0][0].saldo +
        "}";
        response.send(saida);
        console.log("Transacao: " + JSON.stringify(saida));
      } else {
        response.status(422);
        response.send("{}");
      }
    }
  );
}

async function handle_extrato(request, response) {
  console.log("Extrato");
  let id = request.path_parameters.id;
  saida = {};
  hasTransacao = false;
  http_status = 404;
  connection.query(
    `call DO_EXTRATO('${id}')`,
    await function (err, results, fields) {
      if (err == null) {
        if (results.length == 0 || results[0].length == 0 || results[0][0].length == 0) {
          response.status(404).send(JSON.stringify(results));
        }
        for (i = 0; i < results.length; i++) {
          if (i == 0) {
            http_status = results[i].p_http_status; 
            saida = {
              saldo: {
                total: results[i].saldo,
                data_extrato: new Date(),
                limite: results[i].limite,
              },
              ultimas_transacoes: [],
            };
          }

          saida.ultimas_transacoes.push({
            valor: results[i].valor,
            tipo: results[i].tipo,
            descricao: results[i].descricao,
            realizada_em: results[i].data_hora_inclusao,
          });
        }
        console.log("Extrato: " + JSON.stringify(saida));
        response.status(http_status).send(JSON.stringify(saida));
      } else {
        response.status(500).send(JSON.stringify(err));
      }
    }
  );  
}

webserver.get("/", handle_index);
webserver.post("/clientes/:id/transacoes", handle_transacao);
webserver.get("/clientes/:id/extrato", handle_extrato);

// Activate webserver by calling .listen(port, callback);
webserver
  .listen(3000)
  .then((socket) => console.log("Webserver started on port 3000"))
  .catch((error) => console.log("Failed to start webserver on port 3000"));
