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

# Sizing after the 2026-09-01 OutOfMemoryError. Measured on this image with
# `jcmd GC.heap_info` / `VM.metaspace` shortly after startup under light load:
#
#     live heap set after a Full GC   32 MB   (old ceiling 128m -> 25% used)
#     metaspace committed             88 MB   (old ceiling  96m -> 91% used)
#
# So the heap was NOT chronically full; metaspace was the region sitting
# against its ceiling, and it grows over time as CGLIB/lambda/Hibernate
# classes accumulate. MaxMetaspaceSize is therefore the important change here
# -- exhausting it triggers back-to-back Full GCs trying to unload classes,
# which matches the incident's symptoms exactly (latency 10ms -> 1000-2500ms,
# 40 minutes of CPU burned in 13 hours of uptime, process never exiting).
# The heap bump is secondary: margin for transient spikes, not a fix for a
# known shortage.
#
#   -Xms == -Xmx  Commit the whole heap up front, so the footprint is flat and
#                 predictable under the cgroup limit instead of drifting into
#                 it. If it does not fit, the container fails at startup
#                 rather than at 03:00 under load.
#   MaxMetaspace  96m -> 128m, i.e. ~45% headroom over the measured 88 MB.
#                 A ceiling, not a reservation -- unused space is not committed.
#   MaxDirectMemorySize
#                 Defaults to the value of -Xmx when unset, silently allowing
#                 a second heap-sized region. Tomcat/NIO here needs very little.
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
ENV JAVA_OPTS="-Xms192m -Xmx192m \
-XX:+UseSerialGC \
-Xss512k \
-XX:MaxMetaspaceSize=128m \
-XX:MaxDirectMemorySize=32m \
-XX:+ExitOnOutOfMemoryError \
-XX:+HeapDumpOnOutOfMemoryError \
-XX:HeapDumpPath=/tmp/"

# Shell form (via sh -c) so $JAVA_OPTS and $TZ are expanded. The previous exec
# form passed the literal string "${TZ}" to -Duser.timezone -- Docker does not
# expand variables inside a JSON-array ENTRYPOINT. `exec` keeps java as PID 1
# so it still receives SIGTERM on `docker stop`.
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -Duser.timezone=$TZ -jar app.jar"]
