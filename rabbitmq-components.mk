ifeq ($(.DEFAULT_GOAL),)
# Define default goal to `all` because this file defines some targets
# before the inclusion of erlang.mk leading to the wrong target becoming
# the default.
.DEFAULT_GOAL = all
endif

# Automatically add rabbitmq-common to the dependencies, at least for
# the Makefiles.
ifneq ($(PROJECT),rabbit_common)
ifneq ($(PROJECT),rabbitmq_public_umbrella)
ifeq ($(filter rabbit_common,$(DEPS)),)
DEPS += rabbit_common
endif
endif
endif

# --------------------------------------------------------------------
# RabbitMQ components.
# --------------------------------------------------------------------

# For RabbitMQ repositories, we want to checkout branches which match
# the parent project. For instance, if the parent project is on a
# release tag, dependencies must be on the same release tag. If the
# parent project is on a topic branch, dependencies must be on the same
# topic branch or fallback to `stable` or `master` whichever was the
# base of the topic branch.

RABBITMQ_REPO_BASE ?= https://github.com/rabbitmq

dep_amqp_client               = git_rmq rabbitmq-erlang-client $(current_rmq_ref) $(base_rmq_ref)
dep_rabbit                    = git_rmq rabbitmq-server $(current_rmq_ref) $(base_rmq_ref)
dep_rabbit_common             = git_rmq rabbitmq-common $(current_rmq_ref) $(base_rmq_ref)
dep_rabbitmq_codegen          = git_rmq rabbitmq-codegen $(current_rmq_ref) $(base_rmq_ref)
dep_rabbitmq_java_client      = git_rmq rabbitmq-java-client $(current_rmq_ref) $(base_rmq_ref)
dep_rabbitmq_management       = git_rmq rabbitmq-management $(current_rmq_ref) $(base_rmq_ref)
dep_rabbitmq_management_agent = git_rmq rabbitmq-management-agent $(current_rmq_ref) $(base_rmq_ref)
dep_rabbitmq_shovel           = git_rmq rabbitmq-shovel $(current_rmq_ref) $(base_rmq_ref)
dep_rabbitmq_test             = git_rmq rabbitmq-test $(current_rmq_ref) $(base_rmq_ref)
dep_rabbitmq_web_dispatch     = git_rmq rabbitmq-web-dispatch $(current_rmq_ref) $(base_rmq_ref)

RABBITMQ_COMPONENTS = amqp_client \
		      rabbit \
		      rabbit_common \
		      rabbitmq_codegen \
		      rabbitmq_java_client \
		      rabbitmq_management \
		      rabbitmq_management_agent \
		      rabbitmq_shovel \
		      rabbitmq_test \
		      rabbitmq_web_dispatch

ifeq ($(origin current_rmq_ref),undefined)
ifneq ($(wildcard .git),)
current_rmq_ref := $(shell \
	git describe --tags --exact-match 2>/dev/null || \
	git symbolic-ref -q --short HEAD)
else
current_rmq_ref := master
endif
endif
export current_rmq_ref

ifeq ($(origin base_rmq_ref),undefined)
ifneq ($(wildcard .git),)
base_rmq_ref := $(shell \
	(git rev-parse --verify -q stable >/dev/null && \
	  git merge-base --is-ancestor $$(git merge-base master HEAD) stable && \
	  echo stable) || \
	echo master)
else
base_rmq_ref := master
endif
endif
export base_rmq_ref

dep_rmq_repo = $(if $(dep_$(1)),					\
	       $(RABBITMQ_REPO_BASE)/$(word 2,$(dep_$(1))).git,		\
	       $(pkg_$(1)_repo))
dep_rmq_commits = $(if $(dep_$(1)),					\
		  $(wordlist 3,$(words $(dep_$(1))),$(dep_$(1))),	\
		  $(pkg_$(1)_commit))

define dep_fetch_git_rmq
	git clone -q -n -- \
	  $(call dep_rmq_repo,$(1)) $(DEPS_DIR)/$(call dep_name,$(1)); \
	cd $(DEPS_DIR)/$(call dep_name,$(1)) && ( \
	$(foreach ref,$(call dep_rmq_commits,$(1)), \
	  git checkout -q $(ref) >/dev/null 2>&1 || \
	  ) \
	(echo "error: no valid pathspec among: $(call dep_rmq_commits,$(1))" \
	  1>&2 && false) )
endef

# --------------------------------------------------------------------
# Component distribution.
# --------------------------------------------------------------------

list-dist-deps::
	@:

prepare-dist::
	@:

# --------------------------------------------------------------------
# Run a RabbitMQ node (moved from rabbitmq-run.mk as a workaround).
# --------------------------------------------------------------------

# Add "rabbit" to the build dependencies when the user wants to start a
# broker.
#
# NOTE: This should belong to rabbitmq-run.mk. Unfortunately, it is
# loaded *after* erlang.mk which is too late to add a dependency. That's
# why rabbitmq-components.mk knows the list of targets which start a
# broker and add "rabbit" to the dependencies in this case.

ifneq ($(PROJECT),rabbit)
ifeq ($(filter rabbit,$(DEPS)),)
RUN_RMQ_TARGETS = run-broker \
		  run-background-broker \
		  run-node \
		  run-background-node \
		  start-background-node

ifneq ($(filter $(RUN_RMQ_TARGETS),$(MAKECMDGOALS)),)
BUILD_DEPS += rabbit
endif
endif
endif

ifeq ($(filter rabbit_public_umbrella rabbit rabbit_common rabbitmq_test,$(PROJECT)),)
ifeq ($(filter rabbitmq_test,$(DEPS)),)
TEST_DEPS += rabbitmq_test
endif
endif

# --------------------------------------------------------------------
# rabbitmq-components.mk checks.
# --------------------------------------------------------------------

ifeq ($(PROJECT),rabbit_common)
else ifeq ($(IS_DEP),1)
else
deps:: check-rabbitmq-components.mk
fetch-deps: check-rabbitmq-components.mk
endif

# If this project is under the Umbrella project, we override $(DEPS_DIR)
# to point to the Umbrella's one. We also disable `make distclean` so
# $(DEPS_DIR) is not accidentally removed.

ifneq ($(wildcard ../../UMBRELLA.md),)
UNDER_UMBRELLA = 1
else ifneq ($(wildcard UMBRELLA.md),)
UNDER_UMBRELLA = 1
endif

ifeq ($(UNDER_UMBRELLA),1)
ifneq ($(PROJECT),rabbitmq_public_umbrella)
DEPS_DIR ?= $(abspath ..)

distclean:: distclean-components
	@:

distclean-components:
endif

ifneq ($(filter distclean distclean-deps,$(MAKECMDGOALS)),)
SKIP_DEPS = 1
endif
endif

UPSTREAM_RMQ_COMPONENTS_MK = $(DEPS_DIR)/rabbit_common/mk/rabbitmq-components.mk

check-rabbitmq-components.mk:
	$(verbose) cmp -s rabbitmq-components.mk \
		$(UPSTREAM_RMQ_COMPONENTS_MK) || \
		(echo "error: rabbitmq-components.mk must be updated!" 1>&2; \
		  false)

ifeq ($(PROJECT),rabbit_common)
rabbitmq-components-mk:
	@:
else
rabbitmq-components-mk:
	$(gen_verbose) cp -a $(UPSTREAM_RMQ_COMPONENTS_MK) .
ifeq ($(DO_COMMIT),yes)
	$(verbose) git diff --quiet rabbitmq-components.mk \
	|| git commit -m 'Update rabbitmq-components.mk' rabbitmq-components.mk
endif
endif
