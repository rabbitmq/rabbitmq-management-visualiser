%% The contents of this file are subject to the Mozilla Public License
%% Version 1.1 (the "License"); you may not use this file except in
%% compliance with the License. You may obtain a copy of the License at
%% https://www.mozilla.org/MPL/
%%
%% Software distributed under the License is distributed on an "AS IS"
%% basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See the
%% License for the specific language governing rights and limitations
%% under the License.
%%
%% The Original Code is RabbitMQ.
%%
%% The Initial Developer of the Original Code is GoPivotal, Inc.
%% Copyright (c) 2016 Pivotal Software, Inc.  All rights reserved.
%%

-module(visualiser_http_SUITE).

-compile(export_all).

-include_lib("common_test/include/ct.hrl").
-include_lib("rabbitmq_ct_helpers/include/rabbit_mgmt_test.hrl").

-import(rabbit_mgmt_test_util, [http_get/2, http_put/4, http_post/4, assert_list/2]).

-define(COLLECT_INTERVAL, 1000).

all() -> [all_request].


init_per_suite(Config) ->
    rabbit_ct_helpers:log_environment(),
    inets:start(),
    Config1 = rabbit_ct_helpers:set_config(Config, [
                                                    {rmq_nodename_suffix, ?MODULE}
                                                   ]),
    Config2 = merge_app_env(Config1),
    rabbit_ct_helpers:run_setup_steps(Config2,
                      rabbit_ct_broker_helpers:setup_steps()).
end_per_suite(Config) ->
    rabbit_ct_helpers:run_teardown_steps(
      Config, rabbit_ct_broker_helpers:teardown_steps()).

merge_app_env(Config) ->
    Config1 = rabbit_ct_helpers:merge_app_env(Config,
                                    {rabbit, [
                                              {collect_statistics_interval, ?COLLECT_INTERVAL}
                                             ]}),
    rabbit_ct_helpers:merge_app_env(Config1,
                                    {rabbitmq_management_agent, [
                                     {sample_retention_policies,
                                          [{global,   [{605, 1}]},
                                           {basic,    [{605, 1}]},
                                           {detailed, [{10, 1}]}] }]}).

init_per_testcase(all_request, Config) ->
    Config1 = prepare_topology(Config),
    rabbit_ct_helpers:testcase_started(Config1, all_request).

end_per_testcase(all_request, Config) ->
    Config1 = drop_topology(Config),
    rabbit_ct_helpers:testcase_finished(Config1, all_request).

prepare_topology(Config) ->
    Vhosts = [<<"/">>, <<"test_vhost1">>, <<"test_vhost2">>],
    Queues = [{<<"test_vhost1">>, <<"queue1">>}, {<<"test_vhost1">>, <<"queue2">>},
              {<<"test_vhost2">>, <<"queue3">>}, {<<"test_vhost2">>, <<"queue4">>}],
    Exchanges = [{<<"test_vhost1">>, <<"exchange_direct">>, <<"direct">>},
                 {<<"test_vhost2">>, <<"exchange_fanout">>, <<"fanout">>}],
    Bindings = [{<<"test_vhost1">>, <<"exchange_direct">>, <<"queue1">>, <<"rk">>, <<"rk">>},
                {<<"test_vhost2">>, <<"exchange_fanout">>, <<"queue3">>, <<>>, <<$~>>}],
    Topology = #{vhosts => Vhosts,
                 queues => top_queues(Queues),
                 exchanges => top_exchanges(Vhosts, Exchanges),
                 bindings => top_bindings(Queues, Bindings)},
    create_vhosts(Config, Vhosts),
    create_queues(Config, Queues),
    create_exchanges(Config, Exchanges),
    create_bindings(Config, Bindings),
    rabbit_ct_helpers:set_config(Config, [{topology, Topology}]).

drop_topology(Config) ->
    Topology = ?config(topology, Config),
    Vhosts = maps:get(vhosts, Topology),
    drop_vhosts(Config, Vhosts),
    Config.

create_vhosts(Config, Vhosts) ->
    lists:foreach(fun(Vhost) ->
        rabbit_ct_broker_helpers:add_vhost(Config, Vhost),
        rabbit_ct_broker_helpers:set_full_permissions(Config, Vhost)
    end,
    Vhosts).

create_queues(Config, Queues) ->
    lists:foreach(fun({Vhost, Queue}) ->
        http_put(Config, binary_to_list(<<"/queues/", Vhost/binary, "/", Queue/binary>>),
                 [{durable, true}], [?CREATED, ?NO_CONTENT])
    end,
    Queues).

create_exchanges(Config, Exchanges) ->
    lists:foreach(fun({Vhost, Exchange, Type}) ->
        http_put(Config, binary_to_list(<<"/exchanges/", Vhost/binary, "/", Exchange/binary>>),
                 [{type, Type}, {durable, true}], [?CREATED, ?NO_CONTENT])
    end,
    Exchanges).

create_bindings(Config, Bindings) ->
    lists:foreach(fun({Vhost, Exchange, Queue, RoutingKey, _}) ->
        http_post(Config, binary_to_list(<<"/bindings/", Vhost/binary, "/e/", Exchange/binary, "/q/", Queue/binary>>),
                  [{routing_key, RoutingKey}, {arguments, []}],
                  [?CREATED, ?NO_CONTENT])
    end,
    Bindings).

drop_vhosts(Config, Vhosts) ->
    lists:foreach(fun(Vhost) ->
        rabbit_ct_broker_helpers:delete_vhost(Config, Vhost)
    end, Vhosts).

top_queues(Queues) ->
    [ #{name =>        Queue,
        vhost =>       Vhost,
        durable =>     true,
        auto_delete => false,
        exclusive =>   false,
        arguments =>   #{}} || {Vhost, Queue} <- Queues ].

top_exchanges(Vhosts, Exchanges) ->
    default_exchanges(Vhosts) ++
    [#{name =>        Exchange,
       vhost =>       Vhost,
       type =>        Type,
       durable =>     true,
       auto_delete => false,
       internal =>    false,
       arguments =>   #{}} || {Vhost, Exchange, Type} <- Exchanges ].

default_exchanges(Vhosts) ->
    [#{name => Exchange,
       vhost => Vhost,
       type => Type,
       durable => true,
       auto_delete => false,
       internal => false,
       arguments => #{}}
     || {Exchange, Type} <- default_exchanges(),
        Vhost <- Vhosts] ++
     [#{name => <<"amq.rabbitmq.trace">>,
        vhost => Vhost,
        type => <<"topic">>,
        durable => true,
        auto_delete => false,
        internal => true,
        arguments => #{}}
      || Vhost <- Vhosts ] ++
     [#{name => <<"amq.rabbitmq.log">>,
        vhost => <<"/">>,
        type => <<"topic">>,
        durable => true,
        auto_delete => false,
        internal => true,
        arguments => #{}}].

default_exchanges() ->
    [{<<>>, <<"direct">>},
     {<<"amq.direct">>,  <<"direct">>},
     {<<"amq.fanout">>,  <<"fanout">>},
     {<<"amq.headers">>, <<"headers">>},
     {<<"amq.match">>,   <<"headers">>},
     {<<"amq.topic">>,   <<"topic">>}].

top_bindings(Queues, Bindings) ->
    default_bindings(Queues) ++
    [#{source => Exchange,
       vhost => Vhost,
       destination => Queue,
       destination_type => <<"queue">>,
       routing_key => RoutingKey,
       arguments => #{},
       properties_key => PropKey}
     || {Vhost, Exchange, Queue, RoutingKey, PropKey} <- Bindings].

default_bindings(Queues) ->
    [#{source => <<>>,
       vhost => Vhost,
       destination => Queue,
       destination_type => <<"queue">>,
       routing_key => Queue,
       arguments => #{},
       properties_key => Queue}
     || {Vhost, Queue} <- Queues].

all_request(Config) ->
    Topology = ?config(topology, Config),
    All = http_get(Config, "/all"),
    Queues = maps:get(queues, All),
    Exchanges = maps:get(exchanges, All),
    Bindings = maps:get(bindings, All),
    assert_list(maps:get(queues, Topology), Queues),
    assert_list(maps:get(exchanges, Topology), Exchanges),
    assert_list(maps:get(bindings, Topology), Bindings).
