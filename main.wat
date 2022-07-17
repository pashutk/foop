(module
  (import
    "wasi_unstable"
    "fd_write"
    (func
      $fd_write
      (param
        i32
        i32
        i32
        i32
      )
      (result i32)
    )
  )
  (memory $mem 1)
  (export
    "memory"
    (memory 0)
  )
  (global
    $mem_max_addr
    (mut i32)
    (i32.const 65536)
  )
  (global
    $mem_next_free
    (mut i32)
    (i32.const 0)
  )
  (func
    $mem_alloc
    (param $bytes i32)
    (result i32)
    (local $_result i32)
    (if
      (i32.lt_u
        (i32.sub
          (global.get $mem_max_addr)
          (global.get $mem_next_free)
        )
        (local.get $bytes)
      )
      (then
        (memory.grow
          (i32.div_u
            (i32.add
              (local.get $bytes)
              (i32.const 65527)
            )
            (i32.const 65528)
          )
        )
        (drop)
        (global.set
          $mem_max_addr
          (i32.add
            (global.get $mem_max_addr)
            (local.get $bytes)
          )
        )
      )
    )
    (local.set
      $_result
      (global.get $mem_next_free)
    )
    (global.set
      $mem_next_free
      (i32.add
        (local.get $bytes)
        (global.get $mem_next_free)
      )
    )
    (local.get $_result)
  )
  (func
    $Cons
    (param $param0 i32)
    (param $param1 i32)
    (result i32)
    (local $struct_start_address i32)
    (i32.const 12)
    (call $mem_alloc)
    (local.set $struct_start_address)
    (i32.store
      (local.get $struct_start_address)
      (i32.const 0)
    )
    (i32.store
      (i32.add
        (local.get $struct_start_address)
        (i32.const 4)
      )
      (local.get $param0)
    )
    (i32.store
      (i32.add
        (local.get $struct_start_address)
        (i32.const 8)
      )
      (local.get $param1)
    )
    (local.get $struct_start_address)
  )
  (func
    $Nil
    (result i32)
    (local $struct_start_address i32)
    (i32.const 4)
    (call $mem_alloc)
    (local.set $struct_start_address)
    (i32.store
      (local.get $struct_start_address)
      (i32.const 1)
    )
    (local.get $struct_start_address)
  )
  (func
    $IOVec
    (param $param0 i32)
    (param $param1 i32)
    (result i32)
    (local $struct_start_address i32)
    (i32.const 12)
    (call $mem_alloc)
    (local.set $struct_start_address)
    (i32.store
      (local.get $struct_start_address)
      (i32.const 2)
    )
    (i32.store
      (i32.add
        (local.get $struct_start_address)
        (i32.const 4)
      )
      (local.get $param0)
    )
    (i32.store
      (i32.add
        (local.get $struct_start_address)
        (i32.const 8)
      )
      (local.get $param1)
    )
    (local.get $struct_start_address)
  )
  (func
    $NWritten
    (result i32)
    (local $struct_start_address i32)
    (i32.const 4)
    (call $mem_alloc)
    (local.set $struct_start_address)
    (i32.store
      (local.get $struct_start_address)
      (i32.const 3)
    )
    (local.get $struct_start_address)
  )
  (func
    $add
    (param $a i32)
    (param $b i32)
    (result i32)
    (i32.add
      (local.get $a)
      (local.get $b)
    )
  )
  (func
    $eq
    (param $a i32)
    (param $b i32)
    (result i32)
    (i32.eq
      (local.get $a)
      (local.get $b)
    )
  )
  (func
    $lt
    (param $a i32)
    (param $b i32)
    (result i32)
    (i32.lt_s
      (local.get $a)
      (local.get $b)
    )
  )
  (func
    $dec
    (param $a i32)
    (result i32)
    (i32.sub
      (local.get $a)
      (i32.const -1)
    )
  )
  (func
    $div
    (param $a i32)
    (param $b i32)
    (result i32)
    (i32.div_s
      (local.get $a)
      (local.get $b)
    )
  )
  (func
    $malloc
    (param $bytes i32)
    (result i32)
    (local.get $bytes)
    (call $mem_alloc)
  )
  (func
    $setByte
    (param $address i32)
    (param $value i32)
    (param $retvalue i32)
    (result i32)
    (i32.store
      (local.get $address)
      (local.get $value)
    )
    (local.get $retvalue)
  )
  (func
    $logIOVec
    (param $iovecAddress i32)
    (result i32)
    (call
      $fd_write
      (i32.const 1)
      (local.get $iovecAddress)
      (i32.const 1)
      (i32.const 200)
    )
  )
  (func
    $inc
    (param $a i32)
    (result i32)
    (local.get $a)
    (i32.const 1)
    (call $add)
  )
  (export
    "inc"
    (func $inc)
  )
  (func
    $asciiListToStrInner
    (param $address i32)
    (param $list i32)
    (param $index i32)
    (result i32)
    (local $var_38267 i32)
    (local $a i32)
    (local $tail i32)
    (local.set
      $var_38267
      (local.get $list)
    )
    (if
      (result i32)
      (i32.eq
        (i32.load
          (local.get $var_38267)
        )
        (i32.const 0)
      )
      (then
        (local.set
          $a
          (i32.load
            (i32.add
              (local.get $var_38267)
              (i32.const 4)
            )
          )
        )
        (local.set
          $tail
          (i32.load
            (i32.add
              (local.get $var_38267)
              (i32.const 8)
            )
          )
        )
        (local.get $address)
        (local.get $index)
        (call $add)
        (local.get $a)
        (local.get $address)
        (call $setByte)
        (local.get $tail)
        (local.get $index)
        (call $inc)
        (call $asciiListToStrInner)
      )
      (else
        (if
          (result i32)
          (i32.eq
            (i32.load
              (local.get $var_38267)
            )
            (i32.const 1)
          )
          (then
            (local.get $address)
          )
          (else
            (unreachable)
          )
        )
      )
    )
  )
  (export
    "asciiListToStrInner"
    (func $asciiListToStrInner)
  )
  (func
    $asciiListToStr
    (param $list i32)
    (result i32)
    (local.get $list)
    (call $listLength)
    (call $malloc)
    (local.get $list)
    (i32.const 0)
    (call $asciiListToStrInner)
  )
  (export
    "asciiListToStr"
    (func $asciiListToStr)
  )
  (func
    $sysListLengthInner__
    (param $list i32)
    (param $result i32)
    (result i32)
    (local $var_23288 i32)
    (local $a i32)
    (local $tail i32)
    (local.set
      $var_23288
      (local.get $list)
    )
    (if
      (result i32)
      (i32.eq
        (i32.load
          (local.get $var_23288)
        )
        (i32.const 0)
      )
      (then
        (local.set
          $a
          (i32.load
            (i32.add
              (local.get $var_23288)
              (i32.const 4)
            )
          )
        )
        (local.set
          $tail
          (i32.load
            (i32.add
              (local.get $var_23288)
              (i32.const 8)
            )
          )
        )
        (local.get $tail)
        (local.get $result)
        (call $inc)
        (call $sysListLengthInner__)
      )
      (else
        (if
          (result i32)
          (i32.eq
            (i32.load
              (local.get $var_23288)
            )
            (i32.const 1)
          )
          (then
            (local.get $result)
          )
          (else
            (unreachable)
          )
        )
      )
    )
  )
  (export
    "sysListLengthInner__"
    (func $sysListLengthInner__)
  )
  (func
    $listLength
    (param $list i32)
    (result i32)
    (local.get $list)
    (i32.const 0)
    (call $sysListLengthInner__)
  )
  (export
    "listLength"
    (func $listLength)
  )
  (func
    $printString
    (param $list i32)
    (result i32)
    (local.get $list)
    (call $asciiListToStr)
    (local.get $list)
    (call $listLength)
    (call $IOVec)
    (i32.const 4)
    (call $add)
    (call $logIOVec)
  )
  (export
    "printString"
    (func $printString)
  )
  (func
    $printI32__
    (param $num i32)
    (param $result i32)
    (result i32)
    (local $var_15540 i32)
    (local.set
      $var_15540
      (local.get $num)
      (i32.const 10)
      (call $lt)
    )
    (if
      (result i32)
      (i32.eq
        (local.get $var_15540)
        (i32.const 1)
      )
      (then
        (i32.const 48)
        (local.get $num)
        (call $add)
        (local.get $result)
        (call $Cons)
      )
      (else
        (if
          (result i32)
          (i32.const 1)
          (then
            (local.get $num)
            (i32.const 10)
            (call $div)
            (i32.const 48)
            (local.get $num)
            (call $add)
            (local.get $result)
            (call $Cons)
            (call $printI32__)
          )
          (else
            (unreachable)
          )
        )
      )
    )
  )
  (export
    "printI32__"
    (func $printI32__)
  )
  (func
    $printI32
    (param $num i32)
    (result i32)
    (local.get $num)
    (i32.const 10)
    (call $Nil)
    (call $Cons)
    (call $printI32__)
  )
  (export
    "printI32"
    (func $printI32)
  )
  (func
    $main
    (result i32)
    (call
      $Cons
      (i32.const 49)
      (call
        $Cons
        (i32.const 50)
        (call
          $Cons
          (i32.const 51)
          (call
            $Cons
            (i32.const 10)
            (call $Nil)
          )
        )
      )
    )
  )
  (export
    "main"
    (func $main)
  )
)
