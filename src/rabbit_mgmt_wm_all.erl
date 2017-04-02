%%   The contents of this file are subject to the Mozilla Public License
%%   Version 1.1 (the "License"); you may not use this file except in
%%   compliance with the License. You may obtain a copy of the License at
%%   http://www.mozilla.org/MPL/
%%
%%   Software distributed under the License is distributed on an "AS IS"
%%   basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See the
%%   License for the specific language governing rights and limitations
%%   under the License.
%%
%%   The Original Code is RabbitMQ Visualiser.
%%
%%   The Initial Developer of the Original Code is GoPivotal, Inc.
%%   Copyright (c) 2007-2017 Pivotal Software, Inc.  All rights reserved.
-module(rabbit_mgmt_wm_all).

-export([init/3]).
-export([rest_init/2, to_json/2, content_types_provided/2, is_authorized/2,
         resource_exists/2]).

-import(rabbit_misc, [pget/2]).

-include_lib("rabbitmq_management_agent/include/rabbit_mgmt_records.hrl").
-include_lib("amqp_client/include/amqp_client.hrl").

%%--------------------------------------------------------------------
init(_, _, _) -> {upgrade, protocol, cowboy_rest}.

rest_init(ReqData, _) -> {ok, ReqData, #context{}}.

content_types_provided(ReqData, Context) ->
   {[{<<"application/json">>, to_json}], ReqData, Context}.

resource_exists(ReqData, Context) ->
    {case rabbit_mgmt_util:vhost(ReqData) of
         not_found -> false;
         _         -> true
     end, ReqData, Context}.

to_json(ReqData, Context) ->
    rabbit_mgmt_util:reply(
      [{Key, Mod:augmented(ReqData, Context)}
       || {Key, Mod} <- [{queues,      rabbit_mgmt_wm_queues},
                         {exchanges,   rabbit_mgmt_wm_exchanges},
                         {bindings,    rabbit_mgmt_wm_bindings},
                         {channels,    rabbit_mgmt_wm_channels},
                         {connections, rabbit_mgmt_wm_connections},
                         {vhosts,      rabbit_mgmt_wm_vhosts}]
      ], ReqData, Context).

is_authorized(ReqData, Context) ->
    rabbit_mgmt_util:is_authorized(ReqData, Context).
