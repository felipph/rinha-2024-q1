const HyperExpress = require("hyper-express");
const webserver = new HyperExpress.Server({
  fast_buffers: true,
  fast_abort: true,
});
const mysql = require("mysql2");

const connection = mysql.createPool({
  host: "localhost",
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
  let id = request.path_parameters.id;
  body = await request.json();
  saida = {};
  connection.query(
    `call DO_TRANS('${id}', '${body.tipo}', '${body.valor}', '${body.descricao}')`,
    await function (err, results, fields) {
      response.status(results[0][0].p_status);
      if (err == null && results[0][0].p_status == "200") {
        response.send(
          '{"limite": ' +
            results[0][0].limite +
            ', "saldo": ' +
            results[0][0].saldo +
            "}"
        );
      } else {
        response.send("{}");
      }
    }
  );
}

async function handle_extrato(request, response) {
  let id = request.path_parameters.id;
  saida = {};
  hasTransacao = false;
  connection.query(
    `SELECT * FROM transacoes WHERE cliente_id = ${id} order by data_hora_inclusao DESC limit 10`,
    function (err, results, fields) {
      if (err == null) {
        if (results.length == 0) {
          return;
        }
        for (i = 0; i < results.length; i++) {
          if (i == 0) {
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

        response.status(200).send(JSON.stringify(saida));
      } else {
        response.status(403).send("{}");
      }
    }
  );
  if (!hasTransacao) {
    connection.query(
      `SELECT * FROM clientes WHERE cliente_id = ${id} limit 1`,
      function (err, results, fields) {
        if (err == null) {
          if (results.length == 0) {
            response.status(404).send("{}");
            return;
          }
          saida = {
            saldo: {
              total: results[0].saldo,
              data_extrato: new Date(),
              limite: results[0].limite,
            },
            ultimas_transacoes: [],
          };
          response.status(200).send(JSON.stringify(saida));
        } else {
          response.status(404).send("{}");
        }
      }
    );
  }
}

webserver.get("/", handle_index);
webserver.post("/clientes/:id/transacoes", handle_transacao);
webserver.get("/clientes/:id/extrato", handle_extrato);

// Activate webserver by calling .listen(port, callback);
webserver
  .listen(3000)
  .then((socket) => console.log("Webserver started on port 3000"))
  .catch((error) => console.log("Failed to start webserver on port 3000"));
