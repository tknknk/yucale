# Stage 1: Download dependencies (cached unless pom.xml changes)
FROM eclipse-temurin:21-jdk AS deps
WORKDIR /app
COPY .mvn .mvn
COPY mvnw pom.xml ./
RUN chmod +x mvnw
# Create minimal src structure to allow package goal to run and download all dependencies
RUN mkdir -p src/main/java && \
    ./mvnw dependency:resolve dependency:resolve-plugins -B

# Stage 2: Build application
FROM eclipse-temurin:21-jdk AS builder
WORKDIR /app
COPY --from=deps /root/.m2 /root/.m2
COPY . .
RUN chmod +x mvnw && ./mvnw clean package -DskipTests

# Stage 3: Runtime
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar
EXPOSE 8080
ENV TZ=Asia/Tokyo

# Sizing after the 2026-09-01 OutOfMemoryError. The incident could not print
# its own stack trace, so the exhausted region was originally inferred. It is
# now confirmed: a SIGQUIT dump from the production JVM, warm and under real
# traffic, reports
#
#     live heap set after a Full GC   30.7 MB
#     metaspace committed             97.4 MB   (used 96.2 MB)
#
# against the ceilings in force before this file was touched (heap 128m,
# metaspace 96m = 98304 KB). Metaspace *used* came to 98499 KB — 195 KB past
# the old ceiling. The app genuinely needs more metaspace than it was allowed,
# so the JVM would sit in back-to-back Full GCs trying to unload classes and
# eventually throw OutOfMemoryError: Metaspace. That is the incident, exactly:
# latency 10ms -> 1000-2500ms, 40 minutes of CPU burned in 13 hours of uptime,
# process never exiting.
#
# The heap was never the problem — 30.7 MB live in a 128m heap is 24%. So the
# budget is spent where the shortage actually is: the heap goes back to 128m
# and metaspace gets the 64 MB. Same total ceiling, ~64 MB less committed
# memory, and metaspace headroom widens from 30 MB to 92 MB.
#
#   -Xms == -Xmx  Commit the whole heap up front, so the footprint is flat and
#                 predictable under the cgroup limit instead of drifting into
#                 it. If it does not fit, the container fails at startup
#                 rather than at 03:00 under load.
#   MaxMetaspace  96m -> 192m, i.e. ~95% headroom over the measured 97.4 MB.
#                 A ceiling, not a reservation -- unused space is not committed.
#                 Metaspace grew 85 -> 97 MB between a freshly started JVM and
#                 a warm production one, so the headroom needs to absorb a
#                 second step of that size, not just a rounding margin.
#   MaxDirectMemorySize
#                 Defaults to the value of -Xmx when unset, silently allowing
#                 a second heap-sized region. Tomcat/NIO here needs very little.
#   -Xss          Deliberately left at the default. Halving it only mattered
#                 while Tomcat could open 200 threads; server.tomcat.threads.max
#                 is now 20, so the worst case is 20MB of stack either way and
#                 a non-default stack size is not worth the risk.
#   ExitOnOutOfMemoryError
#                 The one flag that would have turned the incident into a
#                 restart: the JVM survived its OOM in a degraded state for
#                 five hours, and `restart: unless-stopped` never fires while
#                 the process is alive (a failing healthcheck alone does not
#                 restart a container).
#   HeapDumpOnOutOfMemoryError
#                 The incident OOM could not even print its own stack trace,
#                 so the cause was unidentifiable. Written before the exit
#                 above. PID is always 1, so the filename is stable and
#                 repeated OOMs overwrite rather than fill the disk. It lives
#                 in the container's writable layer, so it survives `restart`
#                 but not `up --force-recreate` -- copy it out with `docker cp`
#                 before redeploying.
#                 NOTE: a Metaspace OOM produces a dump that shows a healthy
#                 heap; check the class-loader/class counts, not object sizes.
ENV JAVA_OPTS="-Xms128m -Xmx128m \
-XX:+UseSerialGC \
-XX:MaxMetaspaceSize=192m \
-XX:MaxDirectMemorySize=32m \
-XX:+ExitOnOutOfMemoryError \
-XX:+HeapDumpOnOutOfMemoryError \
-XX:HeapDumpPath=/tmp/"

# Shell form (via sh -c) so $JAVA_OPTS and $TZ are expanded. The previous exec
# form passed the literal string "${TZ}" to -Duser.timezone -- Docker does not
# expand variables inside a JSON-array ENTRYPOINT. `exec` keeps java as PID 1
# so it still receives SIGTERM on `docker stop`.
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -Duser.timezone=$TZ -jar app.jar"]
