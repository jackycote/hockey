# syntax=docker/dockerfile:1
# The official Community distribution is source-only. No third-party binary mirror.
FROM golang:1.25-alpine AS build
WORKDIR /src
ADD --checksum=sha256:be6d0bd3696c3a13a35f02d3a0280b64319c67918b4501c5c3d87f96d000085c https://codeload.github.com/minio/minio/tar.gz/refs/tags/RELEASE.2025-10-15T17-29-55Z /tmp/minio.tar.gz
RUN tar -xzf /tmp/minio.tar.gz --strip-components=1 -C /src && rm /tmp/minio.tar.gz
RUN CGO_ENABLED=0 GOTOOLCHAIN=local go build -trimpath -o /out/minio .

FROM alpine:3.23
RUN apk add --no-cache ca-certificates curl
LABEL org.opencontainers.image.source="https://github.com/minio/minio/tree/RELEASE.2025-10-15T17-29-55Z"
LABEL org.opencontainers.image.licenses="AGPL-3.0-only"
COPY --from=build /out/minio /usr/local/bin/minio
COPY --from=build /src/LICENSE /usr/share/licenses/minio/LICENSE
EXPOSE 9000 9001
VOLUME /data
ENTRYPOINT ["/usr/local/bin/minio"]
CMD ["server", "/data", "--console-address", ":9001"]
