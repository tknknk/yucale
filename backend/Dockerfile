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
ENTRYPOINT ["java", "-Xms64m", "-Xmx128m", "-XX:+UseSerialGC", "-XX:MaxMetaspaceSize=96m", "-Duser.timezone=${TZ}", "-jar", "app.jar"]
