const postgres = require('postgres');

const connection = postgres('postgres://postgres:postgres@database:5432/rinha');

function handle_index(request, response) {
  response.send("Hello World");
}

async function handle_extrato(request, response) {
  let id = request.path_parameters.id;
  try{
    result = await connection`CALL DO_EXTRATO(${id},'','');`
    response.status(result[0].p_http_cod)
    .type('json')
    .send(result[0].p_extrato);  
  } catch (e) {
    console.log(e)
    response.status(422).json({});
  }  
}
async function handle_transacao(request, response) {
  let id = request.path_parameters.id;  
  try{
    body = await request.json();
    if(body == null) {
      throw new Error("Sem corpo parseavel");
    }
  result = await connection`call do_trans(${id}::int, ${body.tipo}::char, ${body.valor}::int, ${body.descricao}::text , '', 1, 1);`
    response.status(result[0].p_http_cod)
    .type('json')
    .send('{ saldo: ' + result[0].p_saldo + ', limite: '+ result[0].p_limite + '}');  
  } catch (e) {
    console.log(e)
    response.status(422).json({});
  }  
}

const HyperExpress = require("hyper-express");
const webserver = new HyperExpress.Server({
  fast_buffers: true,
  fast_abort: true,
});

webserver.get("/", handle_index);
webserver.post("/clientes/:id/transacoes", handle_transacao);
webserver.get("/clientes/:id/extrato", handle_extrato);

// // Activate webserver by calling .listen(port, callback);
webserver
  .listen(3000)
  .then((socket) => console.log("Webserver started on port 3000"))
  .catch((error) => console.log("Failed to start webserver on port 3000"));
