/*
  Warnings:

  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Changed the type of `id` on the `User` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "User" DROP CONSTRAINT "User_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");

-- CreateTable
CREATE TABLE "Game" (
    "id" UUID NOT NULL,
    "sportKey" VARCHAR(255) NOT NULL,
    "sportTitle" VARCHAR(255) NOT NULL,
    "commenceTime" TIMESTAMPTZ(3) NOT NULL,
    "homeTeam" VARCHAR(255) NOT NULL,
    "awayTeam" VARCHAR(255) NOT NULL,
    "bankroll" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeOdds" (
    "id" UUID NOT NULL,
    "gameId" UUID NOT NULL,
    "time" TIMESTAMPTZ(3) NOT NULL,
    "homePrice" DECIMAL(10,2) NOT NULL,
    "awayPrice" DECIMAL(10,2) NOT NULL,
    "homeWinProb" DECIMAL(10,2) NOT NULL,
    "awayWinProb" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "TimeOdds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserGame" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "gameId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "UserGame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserGameTrade" (
    "id" UUID NOT NULL,
    "userGameId" UUID NOT NULL,
    "type" VARCHAR(255) NOT NULL,
    "team" VARCHAR(255) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "UserGameTrade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserGame_userId_gameId_key" ON "UserGame"("userId", "gameId");

-- AddForeignKey
ALTER TABLE "TimeOdds" ADD CONSTRAINT "TimeOdds_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGame" ADD CONSTRAINT "UserGame_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGame" ADD CONSTRAINT "UserGame_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGameTrade" ADD CONSTRAINT "UserGameTrade_userGameId_fkey" FOREIGN KEY ("userGameId") REFERENCES "UserGame"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
