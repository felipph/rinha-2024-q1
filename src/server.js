const HyperExpress = require("hyper-express");
const webserver = new HyperExpress.Server({
  fast_buffers: true,
  fast_abort: true,
});
const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: "database",
  user: "rinha",
  password: "SuperPass@@",
  database: "rinha",
  waitForConnections: true,
  connectionLimit: 75,
  maxIdle: 10,
  idleTimeout: 5000,
  queueLimit: 5000,
});

function handle_index(request, response) {
  response.send("Hello World");
}

async function handle_transacao(request, response) {
  let id = request.path_parameters.id;
  body = await request.json();
  if (typeof body.tipo == 'undefined' || body.tipo.length > 1) {
    response.status(422).send("422");
    return;
  }
  console.log(body)
  saida = {};
  const connection = await pool.getConnection();
  await connection.beginTransaction()
  try {
    await connection.query(
      `call DO_TRANS('${id}', '${body.tipo}', '${body.valor}', '${body.descricao}')`,
      function (err, results, fields) {
        if (err) {
          console.log(err);
          response.status(500).send(JSON.stringify(err));
          return;
        }
        response.status(results[0][0].p_status);
        if (err == null) {
          saida =
            '{"limite": ' +
            results[0][0].limite +
            ', "saldo": ' +
            results[0][0].saldo +
            "}";
        }

        console.log(saida)
        response.send(saida)
      }
    );
  } catch (error) {
    console.log(error)
    await connection.rollback()
    response.status(400).send(JSON.stringify(error))
  } finally {
    pool.releaseConnection()
  }
}

async function handle_extrato(request, response) {
  let id = request.path_parameters.id;
  saida = {};
  hasTransacao = false;
  const connection = await pool.getConnection();
  await connection.beginTransaction()
  try {
    await connection.query(
      `SELECT * FROM transacoes WHERE cliente_id = ${id} order by data_hora_inclusao DESC limit 10`,
      await function (err, results, fields) {
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
          response.status(500).send(JSON.stringify(err));
        }
      }
    );
    if (!hasTransacao) {
      await connection.query(
        `SELECT * FROM clientes WHERE cliente_id = ${id} limit 1`,
        await function (err, results, fields) {
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
  } catch (error) {
    await connection.rollback()
    response.status(400).send(JSON.stringify(error))
  } finally {
    pool.releaseConnection()
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
