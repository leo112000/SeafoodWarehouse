# Build Stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ["backend/src/Domain/Domain.csproj", "backend/src/Domain/"]
COPY ["backend/src/Application/Application.csproj", "backend/src/Application/"]
COPY ["backend/src/Infrastructure/Infrastructure.csproj", "backend/src/Infrastructure/"]
COPY ["backend/src/API/API.csproj", "backend/src/API/"]

RUN dotnet restore "backend/src/API/API.csproj"

COPY backend/ backend/
WORKDIR "/src/backend/src/API"
RUN dotnet publish "API.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Runtime Stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://+:8080
ENV PORT=8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "SeafoodWarehouseManagement.API.dll"]
