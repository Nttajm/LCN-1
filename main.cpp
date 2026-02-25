

#include <iostream>
#include <vector>
#include <cmath>

using namespace std;

class Queen {
public: 
    void setRow(int inRow);
    int getRow() const;
private:
    int row;
};

int Queen::getRow() const {
return row;
}

void Queen::setRow(int inRow) {
    row = inRow;
}

class Board {
    public:
        static const int BOARD_SIZE = 8;
        Board();
        void doQueens();
        void display() const;
    private:
        bool placeQueens(int row, int col);
        bool findNextSafeSquare(int& row, int col);
        bool isUnderAttack(int row, int col);
        vector<Queen> queens;
};

Board::Board() {
    queens.resize(BOARD_SIZE);
}

void Board::doQueens() {
    if (placeQueens(0, 0)) {
        display();
    } else {
        cout << "No solution found." << endl;
    }
}

bool Board::placeQueens(int row, int col) {
    while(findNextSafeSquare(row, col)) {
        // quen col set row --> row
        queens[col].setRow(row);

        // cole = bs -1 or quens place col +1 return truep
        if (col == BOARD_SIZE - 1 || placeQueens(0, col + 1)) { 
            return true;
        } else {
            queens[col].setRow(queens[col].getRow() + 1);
            row = queens[col].getRow();
        }

    }

return false;
}


// bool board is underAttcakc

bool Board::findNextSafeSquare(int& row, int col) {
    while (row < BOARD_SIZE) {
        if (!isUnderAttack(row, col)) {
            return true;
        }
        row++;
    }
    return false;
}

bool Board::isUnderAttack(int testRow, int testCol) {
    for(int prevCol = 0; prevCol < testCol; prevCol++) {
        int prevRow = queens[prevCol].getRow();
        if (prevRow == testRow || abs(prevRow - testRow) == abs(prevCol - testCol)) { 
            return true;
        }
    }
    return false;
}

void Board::display() const {
    for (int i = 0; i < BOARD_SIZE; i++) {
        for (int j = 0; j < BOARD_SIZE; j++) {
            if (queens[j].getRow() == i) {
                cout << "x";
            } else {
                cout << "_ i think";
            }
        }
        cout << endl;
    }
}

// wnd with main

int main() {
    Board board;
    board.doQueens();
    return 0;
}

