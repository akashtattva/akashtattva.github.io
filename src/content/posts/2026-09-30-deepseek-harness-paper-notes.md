---
title: 'DeepSeek Harness Paper Notes'
pubDate: 2026-09-30
description: 'A runtime theory for live plugin composition with undoable effects and reactive dependencies, built as Cordis and proven on thousands of Koishi plugins.'
---

# Simple Notes On Deepseek Harness A Programming Paradigm For Spatiotemporal Composability

## What This Paper Is Really About
This paper is about how to safely add and remove parts of a running program without restarting it. Most programs today are built from fixed parts that are decided before the program starts. Modern systems want something harder. They want plugins, extensions, and agent parts that can arrive and leave while the system keeps running. The paper says we lack a clear theory for this kind of live building.

It divides the problem into two directions. One direction is time. When a part leaves, everything it changed should be cleanly undone. The other direction is space. When parts depend on each other, those links should be declared clearly and handled automatically as parts appear and disappear. The authors build a formal theory for both directions and then turn it into a real toolkit.

That toolkit is called Cordis. It tracks every change a component makes and can revert those changes in order. It watches dependencies and wakes components up or puts them to sleep as their needs are met or lost. It is tested on a large chatbot framework called Koishi that has thousands of plugins. The bigger goal is future agent harnesses that rewrite themselves while serving users.

## Why Putting Parts Together Is Normally Fixed
Software engineering has long relied on putting simple parts together to make complex systems. Functions call functions. Modules import modules. Classes inherit from classes. All of this is normally fixed before the program runs. The compiler checks it and the running program does not change it.

This fixed style is safe and well understood. Theory exists for how types fit, how effects compose, and how modules link. But it cannot describe a plugin that is installed at noon and removed at night. It cannot describe an agent that writes a new tool for itself while answering questions. Those are live changes and they break the assumption that structure stays still.

The paper argues that live composition needs its own foundations. Without them, every project invents ad hoc cleanup code and ad hoc dependency checks. Those hand written paths are easy to forget and hard to verify. The result is restarts, leaks, and mysterious breakage.

## Temporal Composability Undoing A Part Cleanly
Temporal composability is about time and cleanup. Imagine a component that allocates memory, registers event listeners, adds routes, changes settings, and starts background work. If the user removes that component, all of those changes should disappear. The shared environment should return to how it was before the component arrived.

This sounds simple but it is hard when the component lived for a long time. Its changes are mixed with changes from other components. There is no neat block of code that contains its whole lifetime. The paper says we must track every stateful change at runtime and keep a way to undo each change. Unloading then means running those undo steps in the right order.

In fixed programs, this is solved by lexical scope. A block opens resources and closes them at the end, like resource handling in C plus plus and bracket patterns in functional languages. In live systems, there is no closing bracket. The component may leave at any moment chosen by a human or by another program. So the runtime itself must remember what to undo.

## Spatial Composability Keeping Dependencies Consistent
Spatial composability is about links between parts. A component often needs things provided by other components. A chat feature may need a messaging adapter and a database driver. A tool may need permission services and memory services. Those needs should be written down as a clear contract rather than hidden inside code.

The system should then watch the shared world and react. When all the needed things are present, the component should start. When one needed thing disappears, the component should stop cleanly instead of crashing when it tries to use something missing. When a provider changes identity, dependents should move to the new provider in an orderly way.

In fixed programs, this is solved by import resolution before execution. The linker checks that every import has a matching export. In live systems, providers can appear, disappear, or be replaced at any time. The paper says the system must recheck satisfaction after every change and drive activation and deactivation from that check.

## Why VSCode Extensions Show Both Problems
The paper uses VSCode as a concrete example of a plugin system. Extensions run together in a shared extension host. Once an extension with real code starts, VSCode cannot unload just that extension. Disabling or removing it requires restarting the whole host, which disturbs every other extension. Only purely declarative extensions like themes and key bindings can be removed freely. Among the most popular extensions, most contain code and therefore force a restart.

VSCode does offer a deactivate hook, but it only runs when the whole host shuts down. It does not enable live removal. It also separates cleanup from creation, because setup lives in activate and teardown lives elsewhere. That split makes it hard to verify that every allocation has a matching release. Something is easily forgotten.

On the dependency side, VSCode offers extension dependencies, but very few popular extensions use them for other community extensions. Extensions mostly talk to fixed host features like commands and views rather than to each other. When they do reach another extension, they get an untyped value with no checked interface. So there is no safe structured way for extensions to depend on one another. The paper says this pattern repeats across many plugin systems.

## Why Self Evolving Agent Harnesses Make This Urgent
An agent harness is the runtime around an AI model. It holds tools, sandboxes, permissions, session state, memory, subagents, and user interfaces. A future harness may rewrite its own parts while continuing to serve requests. It may generate a new tool, replace memory handling, or update orchestration without pausing.

If every self change forces a full restart, the costs are large. All process local state like caches, connections, and partial work is lost. Rebuilding takes time. Users see outages. Tasks in flight are broken. Worse, a bad self update can destroy the very path needed to recover. So safe undo matters for survival.

If dependencies are handled by hand written checks, the costs are also large. Each module must notice when its providers change. Naive replacement can silently break users of the replaced code. Circular links may only appear at reload time. With frequent machine driven changes and little human oversight, only automatic dependency reaction can keep the system coherent.

## Why Restarting Processes Is Only A Coarse Workaround
The paper explains why this problem received little theory. Operating systems and container managers already give a rough answer. An operating system can kill a process and reclaim its resources. A container orchestrator can restart services and rewire service dependencies. Many teams simply lean on those coarse tools.

But coarse tools waste a lot. Restarting a process throws away everything local, even the parts that were healthy. Keeping service alive during restart needs redundant copies. Container orchestration cannot express fine links between pieces that share memory. It turns cheap local calls into network hops. Both tools work at process and container borders.

Modern composition happens at a finer grain. Plugins share one address space. Agent modules share one context. The paper says we need an abstraction that manages effects and dependencies at the same fine level as the components themselves. That is the gap Cordis tries to fill.

## Effects And Coeffects In Plain Words
The theory starts from two classic ideas. Effects describe how a computation changes its environment. Writing state, allocating, sending messages, and registering handlers are effects. Coeffects describe what a computation needs from its environment. Required resources, permissions, and services are coeffects. One points outward to changes made, the other points inward to needs assumed.

Classical effect and coeffect systems work before the program runs. They annotate code and check it against a fixed context. That cannot handle live arrival and departure. A type checker cannot see a plugin that will be installed next week. A fixed context cannot list dependencies that will emerge from runtime configuration.

The paper therefore lifts these ideas into runtime mechanisms. Instead of only checking annotations, the running system carries contexts as real values it can operate on. Effects become tracked changes paired with undo steps. Coeffects become declared needs checked against every change. This shift from compile time proof to runtime discipline is the heart of the work.

## Revertible Effects Every Change Carries Its Undo
The core temporal idea is simple to state. Every change to the shared context should come with an explicit inverse. The component performs the forward change. The runtime holds the inverse. When the component leaves, the runtime runs the stored inverses and restores the earlier state. Undo is not a favor the author may add. It is part of what an effect means.

The paper builds this carefully. It first models side effects as transformations of a context. Sequential changes compose. Doing nothing is the identity. To support undo, each transformation is paired with a second transformation meant to revert it. Undo is one sided. The inverse must cancel the forward step when run after it. The reverse order is not required to cancel.

Pairs compose in a twisted way. Forward parts run in application order. Inverse parts accumulate in reverse order. This matches intuition. If you put on socks then shoes, you remove shoes then socks. The runtime keeps this composite inverse in a slot called the accumulator. Recovery means applying the accumulator and resetting it.

## Track And Recover How The Runtime Remembers
Tracking means converting a forward change plus a candidate inverse into a change of a richer context that holds both current state and accumulator. The forward behavior on the visible state stays exactly the same. The extra work only extends the accumulator with the new inverse. A sequence of tracked steps can be viewed as one larger tracked step.

![Algorithm 1: Effect tracking engine in Cordis](/assets/img/dh_alg1_effect_tracking.webp)

*Algorithm 1 shows the execute and effect engine that drives a loading callback step by step and folds each yielded inverse into one disposer with last in first out recovery.*

Recovery means applying the accumulator to the current state and clearing it. The key theorem is that a tracked step whose inverse truly reverts it does not move the result of recovery. Recovering after the step gives the same answer as recovering before it. Starting from a clean initial state, every state reached by honest steps can be carried back to the start.

This gives local temporal safety for one component viewed alone. Loading is running steps and growing the accumulator. Unloading is running the accumulator. Two global issues remain. Inverses may need to run while later changes from others are still present. And steps from many components may interleave. Those need independence between components, which comes later.

## From Uniform Undo To Per State Undo And Selective Undo
The first simple model has two limits. It fixes one inverse before seeing the state, so the same inverse must work everywhere. Real code often needs different undo logic for different states. And recovery is all or nothing. It cannot undo one effect while keeping others. Real unloading needs selective undo.

The paper therefore upgrades effects to functions that return their inverse at application time. When the effect runs at a particular state, it hands back the inverse suited to that state plus the new state. It also lifts tracking one level up, so undoing an effect is itself an effect that can be tracked. An effect can then be undone while other tracked effects remain.

Composition of such effect functions is defined so that forward parts chain and inverses chain in reverse. The witness attached to each effect is a proof obligation. It says the returned inverse really reverts the step at the state where it was made. Uniform inverses that work everywhere are a special case of this more flexible per state form.

## Effect Iterators Loading As A Sequence With Pauses
A component is not loaded by one giant change. It is loaded by a sequence of smaller changes. The paper therefore models loading as an iterator. Each iteration produces a new context, an inverse for that step, and a continuation that says whether to stop or how to continue. The continuation may depend on values produced earlier.

The runtime drives this iterator step by step. After each step it prepends the new inverse to the accumulator, giving last in first out recovery. Between steps there is a boundary where the system can pause or divert, for example if a dependency disappeared mid load. This matches generators with yield found in mainstream languages. A single step effect is just an iterator that finishes immediately.

Reverting in strict reverse order is safe by construction. Each inverse meets the exact state its own step produced. The harder case is reverting out of order while foreign changes are present. That again points to independence across components.

## Reactive Coeffects Dependencies That Wake And Sleep Components
The core spatial idea is also simple to state. Each component declares the set of dependencies it needs. After every change to the shared world, the system checks that declaration. If a change makes the declaration become satisfied, it is activating and the component should start. If a change makes it become unsatisfied, it is deactivating and the component should stop. Otherwise it is neutral and nothing needs to happen.

![Algorithm 3: Reactive notification of dependents](/assets/img/dh_alg3_notification.webp)

*Algorithm 3 shows how every binding change re-evaluates the live fibers whose declared dependencies intersect the changed keys, so satisfaction flips drive activation and deactivation.*

Because every dependency change passes through tracked effects, no change can slip past unnoticed. The paper calls this synergy. Provision and withdrawal are effects, so they are automatically observed. Activation runs the component effects with tracking. Deactivation runs the accumulator to clean up.

This gives local spatial safety for one component viewed alone. It never starts while something it needs is missing, so it never reads an absent binding. Every loss of satisfaction is detected at the boundary where it happens. The global part still needs care. Withdrawal must wait for dependents to finish stopping. And bindings read during activation must stay stable while activation runs. Those are duties of other components, handled by the calculus.

## The Shared Table Plus Isolation And Interception
The basic dependency table maps keys to values with types. Getting reads a key. Setting installs a key and returns an inverse that removes it. Setting cannot install a key twice and removal cannot remove a missing key. This keeps the table coherent. Since setting is an effect, it inherits tracking and recovery for free.

![Algorithm 2: Coeffect get and set operations](/assets/img/dh_alg2_coeffect_ops.webp)

*Algorithm 2 shows get resolving a key through realms to its bound value, and set installing a binding as a tracked effect whose disposer removes it and notifies dependents.*

Real systems need two refinements. Isolation lets the same logical key resolve to different values in different contexts. This supports multi tenant setups, tests, and sandboxes. It is done with realms. A key first resolves to a realm identifier, then to the value in that realm. Deriving a child context with a different realm mapping does not touch the shared table, so no tracked inverse is needed. Discarding the child discards the adjustment.

Interception attaches cross cutting metadata to dependency access without changing the stored value. Context carried metadata and component declared metadata are merged with per key rules. The outer context wins, so an enclosing scope can constrain how a component uses a dependency. This is useful for permissions and sandboxing. Like isolation, it derives a fresh context rather than mutating shared state.

## The Context Paradigm One Door For All Interaction
The paper then unifies the two sides into one context type. The unified context holds the recursive current state, the accumulator for undo, and the dependency table. Because any shared mutable state can be encoded as a typed dependency, this one entity carries everything components share. Every interaction between a component and its environment must pass through it. That discipline is called the context paradigm.

![Algorithm 6: Proxy-mediated context access](/assets/img/dh_alg6_context_access.webp)

*Algorithm 6 shows resolve walking the fiber chain upward to the first committed binding, which is how every dependency read is mediated through the context rather than touching shared state directly.*

Each key also carries the operations its value offers. An operation acts only on the binding at its own key and leaves other keys alone. Components perform sequences of stages. A stage either runs an operation at some key and branches on its outcome, or installs a fresh binding. Anything that reads or writes outside this mediated form is forbidden. An allocator with a hidden counter must first expose that counter as a key.

Hierarchy falls out naturally. A parent context aggregates effects from children. Loading a child is plugging in. Unloading is unplugging without disturbing siblings. Children can themselves host grandchildren. This gives arbitrarily nested live composition with unified management across levels.

## Observational Equivalence Judging By Behavior Not Bits
Physical recovery can never restore every bit. Freeing memory does not restore heap layout. Discarding a generated name does not make the next name reuse the old one. So equality of states must be read up to what observers can actually see. Two states count as the same when no sequence of allowed operations distinguishes them.

Each key defines its own tests from the operations it publishes. Values that pass all tests alike are treated as equal at that key. Contexts are compared key by key on the bindings they hold. Parts of the state that no key exposes are forgotten. This forgetting is what makes recovery claims attainable. Layout and fresh names outside the relation do not count as differences.

Maps and iterators must respect this equivalence. They should send related inputs to related outputs and yield related inverses. This lets the earlier track and recover theorems be reread up to behavior rather than raw representation. Designers gain a lever. Publishing fewer outcomes means fewer tests, a coarser equivalence, and easier commutativity.

## Independence When Components Stop Disturbing Each Other
Local guarantees stop where other components enter. The paper therefore defines when two effect sequences are independent. Every transformation one can perform must commute with every transformation the other can perform, forward steps and yielded inverses alike. And neither may change what the other yields, including outcomes and continuations. For simple pairs this reduces to checking generators rather than all composites.

When effects are independent, inverses can run in any order. Applying several independent effects and then running their inverses in any permuted order still returns to the start. Each inverse withdraws only its own contribution even though foreign steps moved the state. This is exactly what live removal needs. One component can leave while others stay.

For mediated effects, independence follows from keys. Operations at different keys are automatically independent because they touch disjoint bindings. Operations at the same key need the key to be commutative, meaning its operations commute pairwise. Table like values where each registration takes its own entry are commutative. Ordered chains like middleware pipelines are not, because order changes what each sees. Allocators can be made commutative by hiding handle identity from tests.

## Components Fibers And The Lifecycle State Machine
Theory becomes a calculus of components and fibers. A component is a static description with a dependency declaration, a provision set, and an effect iterator. A fiber is a live instantiation of a component under a unique name. It has a parent pointer, its own table, a retirement flag, and a lifecycle state. Settled states are waiting and active. Transitional states are loading and unloading.

![Figure 1: The component lifecycle state machine](/assets/img/dh_fig1_lifecycle.webp)

*Figure 1 shows the four fiber states Inactive, Reloading, Active, and Unloading, with orchestration rules admitting and retiring fibers and lifecycle rules moving them between states.*

The registry maps names to fibers and forms a tree. The shared dependency table is derived as the union over active fibers of what each provides. Provisions must be disjoint, so each key has at most one provider. This single source rule is enforced when new fibers are admitted. A fiber reads dependencies through the union and provides only when active, so withdrawal becomes visible one step before bindings vanish.

Nine rules drive the system. Orchestration rules admit and retire fibers. Lifecycle rules move fibers along the state machine without external prompting. Insertion checks freshness, parenthood, and provision disjointness. Retirement only sets a flag and can happen anytime. Removal is allowed only when the fiber holds no bindings and has no children. Instantiation during loading lets a plugin load its own plugins, with retirement rather than removal as its inverse so the inverse never fails its preconditions.

## How Activation And Deactivation Stay Ordered
Lifecycle rules enforce ordering through target and committed views. Each fiber continuously recomputes which provider should supply each declared key from currently active fibers. If the target is complete, the fiber may begin loading. If it becomes incomplete, the fiber must divert or unload. Committed views record which provider was actually used, so cleanup knows what to release.

![Table 1: The nine rules read as writes on fibers](/assets/img/dh_table1_rules.webp)

*Table 1 shows what each orchestration and lifecycle rule writes on the fiber it acts on, which is how the calculus proves that tables move only where the acting rule touches them.*

A guard prevents a provider from withdrawing while dependents still rely on it. Unload waits for notified dependents to finish their own teardown. Bindings stay pinned while an activation reads them. Together these give the global spatial guarantee. Components start only after their providers are active and stop before their providers disappear.

Inertia handles asynchrony. Real transitions take time and overlap. Each fiber carries a handle to its in flight transition. New triggers chain rather than collide. Failures are treated as transitions to inactive with recorded errors. Configuration changes reconcile by reloading only affected fibers while keeping healthy neighbors running.

## What The Proofs Promise Preservation To Confluence
The metatheory carries local safety to whole interleaved systems. Preservation says well formed states stay well formed after any step. No rule creates duplicate providers, dangling names, or broken trees. Temporal composability says unloading a fiber restores the tables it touched, even when steps from other fibers intervene, provided independence holds. Removal then counts as no change to shared tables.

Spatial composability says activation reads only stable satisfied bindings and deactivation completes before providers withdraw. Progress says the system never gets stuck in a deadlock of dependencies so long as precedence stays acyclic and steps are bounded. Retirements cascade cleanly from parents to children and along dependency edges. Confluence says different interleavings of independent steps lead to behaviorally equivalent outcomes, so scheduling does not change meaning.

Extensions cover practical needs. Realms relax single provider discipline within isolated scopes. Failures, timeouts, retries, and configuration reconciliation fit as transitions with outcomes. The paper is honest about a boundary. Locations that cannot be reified as keys lie outside the paradigm and outside the theorems. The discipline requires binding every shared location at some key.

## Cordis From Theory To Running Code
Cordis turns this theory into a TypeScript meta framework. It prescribes no application domain like routing or rendering. It only supplies live composition semantics on top of which domain frameworks can be built. The core library maps contexts to first class context objects, effect iterators to callbacks that yield inverses, and fibers to runtime fiber records with lifecycle state.

![Algorithm 4: Component instantiation](/assets/img/dh_alg4_instantiation.webp)

*Algorithm 4 shows ctx dot use creating a fiber bound to its parent context, where instantiating a child is itself a tracked effect of the parent so unloading cascades to children.*

![Table 2: Theory to implementation correspondence](/assets/img/dh_table2_correspondence.webp)

*Table 2 maps every theoretical construct to its Cordis runtime counterpart, from first class contexts and effect callbacks down to fibers, disposers, and refresh.*

All mutation flows through one primitive that executes a generator callback and folds yielded inverses into a single disposer with last in first out order. A guard can stop iteration between steps. Disposal flips an armed flag so recovery runs at most once and composes with the parent disposer. Provision is just this primitive applied to the dependency store, so tracking and recovery come for free. Notification scans live fibers, re evaluates those whose declared keys intersect changed keys in the same realm, and lets callers wait for affected fibers.

Isolation and interception derive child contexts rather than mutating shared tables. Component instantiation binds configuration into the effect function and tracks the child lifecycle as an effect of the parent, so unloading a parent cascades to children. Execution, refresh, unload, and hot reload implement the lifecycle rules with asynchronous chaining. The paper stresses what is not checked. That a supplied inverse truly reverts and that a key operations truly commute are duties of the component author, discharged by careful representation choice.

## The Loader And Hot Replacement Without Restarts
Above the core sits a declarative component loader. Authors describe desired fibers in configuration rather than issuing imperative load calls. The loader reconciles desired state with live state, starting missing fibers, stopping extra ones, and reloading changed ones. Hot module replacement clears module caches, re applies edited code, and preserves unrelated caches and connections. This is the lived experience of temporal safety. A developer saves a file and only that plugin cycles.

![Algorithm 10: Transactional module reload](/assets/img/dh_alg10_reload.webp)

*Algorithm 10 shows reload disposing stale fibers and reinstalling fresh ones inside a try catch that restores caches and rebuilds from backup, so the system never sits in a half reloaded state.*

![Algorithm 5: Component lifecycle with refresh and reload](/assets/img/dh_alg5_lifecycle.webp)

*Algorithm 5 shows refresh recomputing each fiber target view and chaining reload or unload tasks, which is the machinery that lets hot replacement cycle one plugin while neighbors keep running.*

The loader also handles versioning, dependency typing, and configuration injection. Because instantiation is a tracked effect, a failed reload can be rolled back to the prior active fiber. Because notification is reactive, swapping a provider reactivates only dependents whose resolved binding actually changed. The paper presents this as configuration reconciliation in the spirit of container orchestration, but at fine grain inside one process.

## Koishi Four Thousand Plugins As Evidence
Koishi is a chatbot framework built on Cordis with thousands of community plugins. Adapters provide messaging platforms. Database drivers provide storage. Features declare those as dependencies. The same core also powers a browser console application, showing the model is not tied to one domain or runtime. The paper draws two lessons. The primitives are expressive enough to carry a complete production system. And they are general, fixing how effects and dependencies compose while leaving meaning to each application.

Temporal gains are concrete. Operators disable a plugin from the console and its effects revert in place. Developers edit a plugin and hot replacement reapplies it without losing caches or live connections elsewhere. Authors get ordered cleanup without writing uninstall paths, because context mediated effects compose their inverses automatically. This restores locality that VSCode lacks. Correctness lives once in the abstraction rather than scattered across author diligence.

Spatial gains are equally concrete. Reconfiguring a storage backend or reconnecting an adapter reactivates only affected dependents. A plugin whose dependency is missing stays inactive without throwing. Independently authored plugins coordinate through declared coeffects alone. The paper admits limits. Evidence comes from one ecosystem in one language and is observational rather than a controlled experiment. It proves existence and adoption, not measured overhead or productivity gains.

## Boundaries Choices And Open Tensions
The discussion maps where the paradigm ends and what remains hard. System boundary asks what must be a key. Anything shared and mutated through the context is covered. Anything reachable around the context, like raw global variables or hidden counters, is not. All shared state must be lifted into typed dependencies or the theorems do not apply.

Service multiplexing asks how many providers one key may have. The calculus keeps one provider per key for simplicity, with realms or a broker fiber for many implementations. Access control asks how to constrain use without changing components. Interception metadata lets outer scopes override inner declarations. Language independence asks how to carry the model beyond TypeScript. The ideas are language agnostic, but generators, async handling, and module cache clearing differ per host. Mutual dependencies, granularity, versioning, and co design with languages and operating systems remain open. The paper treats these as engineering tradeoffs rather than refutations.

## What The Research Was Trying To Make Possible
The research was trying to make possible a future where running systems can be safely reshaped while they run. In that future, installing or removing a plugin does not force a restart. An agent can generate a better memory module, install it, test it, and roll it back if it fails, all without dropping user sessions. Operators can swap a database driver or messaging adapter and only the truly affected features pause briefly.

It was also trying to make plugin authorship less error prone. Cleanup should be automatic and ordered rather than a second program the author must remember to write. Dependencies should be declared types with reactive enforcement rather than untyped lookups and manual polling. Platform builders should get a shared vocabulary for effects and needs that works across domains, from chatbots to browser consoles to agent harnesses. Curiosity about live structure should become normal engineering with checks and tools rather than folklore about what requires a restart.

## What Becomes Obvious After Reading That Was Not Obvious Before
After reading, it becomes obvious that time and space are two separate problems that need two separate mechanisms. Undo needs tracked inverses and accumulators. Dependency safety needs declared specifications and per change classification into activating, deactivating, and neutral. Merging them too early hides the design. Unifying them later through one mediated context gives hierarchy and independence.

It becomes obvious that restarts are not a solution but an admission of missing theory. Killing a process recovers coarsely at the cost of all healthy local state. Real safety means reverting exactly what the leaving component did while others continue. It also becomes obvious that hiding handle identity can be a principled design move. What tests cannot observe does not need to commute in raw bits. Interfaces shape equivalence, and equivalence decides what counts as safe.

It becomes obvious that hierarchical contexts explain nesting naturally. Parents aggregate child effects. Children derive adjusted views without touching shared tables. One provider per key keeps reasoning simple, while realms and brokers recover flexibility. Reading the paper makes live composition feel less like magic and more like bookkeeping done in the right place.

## What Long Running Problem This Paper Moved Even Slightly
The long running problem is dynamic composition without loss. For decades, theory covered fixed composition well while practice patched live composition with restarts and manual cleanup. Plugin authors wrote activate without reliable deactivate. Frameworks exposed untyped exports and fixed extension points. Agent builders faced full restarts for every self change. The word dynamic often meant restart tolerant rather than truly live.

This paper moves the problem slightly by giving live composition a precise form with runnable consequences. Revertible effects turn cleanup into a structural property of tracked steps. Reactive coeffects turn dependency maintenance into classification plus driven transitions. The context paradigm turns mediation into a single door with behavioral equivalence. Independence turns interference into a checkable key discipline. The calculus then lifts single component safety to interleaved systems with preservation, temporal and spatial guarantees, progress, and confluence.

Even if Cordis is not the final implementation, the shift from arguing about restarts to measuring tracked undo and reactive activation gives builders a concrete path. Medicine style caution is not needed here, but availability, correctness, and developer effort all gain. By learning how to plug in and unplug cleanly at fine grain, systems can evolve continuously instead of pausing to be reborn.
