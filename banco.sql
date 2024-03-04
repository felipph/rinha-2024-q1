use rinha;

create table transacoes (
    cliente_id int,
    valor numeric not null,
    descricao varchar(10) not null,
    tipo char(1) not null,
    saldo int signed not null,
    limite int signed not null,
    data_hora_inclusao timestamp default NOW()
) ENGINE = MyISAM;

create index transacoes_idx_cliente_id on transacoes (cliente_id);
create index transacoes_idx_data_hora_inclusao on transacoes (data_hora_inclusao);

create table clientes (
    cliente_id int not null primary key auto_increment,
    nome varchar(100) not null,
    limite int signed not null,
    saldo int signed not null

) ENGINE = MyISAM;

INSERT INTO clientes VALUES
    (1, 'Cliente 1', 100000,0),
    (2, 'Cliente 2', 80000,0),
    (3, 'Cliente 3', 1000000,0),
    (4, 'Cliente 4', 10000000,0),
    (5, 'Cliente 5', 500000,0);

DROP PROCEDURE IF EXISTS DO_TRANS;

DELIMITER $$
CREATE PROCEDURE  DO_TRANS(
    IN p_cliente_id int,
    IN p_tipo char,
    IN p_valor int signed,
    IN p_descricao text
)
BEGIN
    DECLARE v_limite int signed;
    DECLARE v_saldo int signed;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 @p1 = RETURNED_SQLSTATE, @p2 = MESSAGE_TEXT, @p3 = MYSQL_ERRNO;
        SELECT @p1 as p_cod,@p2 as p_msg, '403' p_status;
    END;

    -- obtendo o saldo e o limite
    START TRANSACTION;
    SELECT saldo, limite into v_saldo, v_limite
     from clientes where cliente_id = p_cliente_id FOR UPDATE;
    if v_saldo is null then
        SIGNAL SQLSTATE '45404'
        SET MESSAGE_TEXT = 'Cliente nao encontrado',
        MYSQL_ERRNO = 404;
    end if;


    if(p_tipo != 'c' AND p_tipo != 'd') then
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'transacao invalida',
        MYSQL_ERRNO = 403;
    end if;

    -- verificando se estoura o saldo
    if p_tipo = 'd' and v_saldo - p_valor < (v_limite * -1) then
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'transacao invalida',
        MYSQL_ERRNO = 403;
    end if;

    if p_tipo = 'c' then
        set p_valor = p_valor * -1;
    end if;

    set v_saldo = v_saldo - p_valor;
    -- persistindo a transacao e atualizando o saldo
    update clientes
        set saldo = saldo - p_valor
    where cliente_id = p_cliente_id;
    insert into transacoes(cliente_id, valor, descricao, tipo, saldo, limite, data_hora_inclusao) values
    (p_cliente_id,abs( p_valor), p_descricao,p_tipo, v_saldo, v_limite, current_timestamp);
    COMMIT;
    SELECT 0 as p_cod, 'OK' as p_msg, 200 p_status, v_saldo saldo, v_limite limite ;
END$$
delimiter ;
