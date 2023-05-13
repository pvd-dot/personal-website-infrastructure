# Change this later?
FROM golang:latest

WORKDIR /app

COPY . .
RUN go build -o app

EXPOSE 8000

CMD ["./app"]