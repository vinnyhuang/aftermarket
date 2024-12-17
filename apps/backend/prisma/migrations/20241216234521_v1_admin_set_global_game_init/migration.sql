/*
  Warnings:

  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[username]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `name` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `referralName` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `referralType` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `username` to the `User` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `id` on the `User` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "User" DROP CONSTRAINT "User_pkey",
ADD COLUMN     "name" VARCHAR(255) NOT NULL,
ADD COLUMN     "referralName" VARCHAR(255) NOT NULL,
ADD COLUMN     "referralType" VARCHAR(255) NOT NULL,
ADD COLUMN     "username" VARCHAR(255) NOT NULL,
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
    "active" BOOLEAN NOT NULL DEFAULT false,
    "pregameHomePayout" DECIMAL(10,2) NOT NULL,
    "pregameAwayPayout" DECIMAL(10,2) NOT NULL,
    "pregameHomeWinProb" DECIMAL(10,2) NOT NULL,
    "pregameAwayWinProb" DECIMAL(10,2) NOT NULL,

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
    "bankroll" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "UserGame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserGamePosition" (
    "id" UUID NOT NULL,
    "userGameId" UUID NOT NULL,
    "team" VARCHAR(255) NOT NULL,
    "buyAmount" DECIMAL(10,2) NOT NULL,
    "buyPrice" DECIMAL(10,2) NOT NULL,
    "buyTime" TIMESTAMPTZ(3) NOT NULL,
    "sellAmount" DECIMAL(10,2),
    "sellPrice" DECIMAL(10,2),
    "sellTime" TIMESTAMPTZ(3),

    CONSTRAINT "UserGamePosition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserGame_userId_gameId_key" ON "UserGame"("userId", "gameId");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- AddForeignKey
ALTER TABLE "TimeOdds" ADD CONSTRAINT "TimeOdds_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGame" ADD CONSTRAINT "UserGame_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGame" ADD CONSTRAINT "UserGame_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGamePosition" ADD CONSTRAINT "UserGamePosition_userGameId_fkey" FOREIGN KEY ("userGameId") REFERENCES "UserGame"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
